#!/usr/bin/env ruby

# Refreshes citation metadata without rewriting the publication archive.
#
# Google Scholar is a discovery and citation source, not the canonical source
# for paper titles, abstracts, or links. The local publication file therefore
# remains authoritative; this script matches its titles to a Scholar profile
# and writes a small generated sidecar consumed by either website.

require "date"
require "fileutils"
require "nokogiri"
require "open-uri"
require "optparse"
require "unicode_normalize/normalize"
require "yaml"

DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " \
                     "AppleWebKit/537.36 Chrome/138 Safari/537.36"

options = {
  check: false,
  max_age: 45,
  max_pages: 10,
  minimum_coverage: 0.95,
  profile: nil,
  publications: nil,
  output: nil
}

OptionParser.new do |parser|
  parser.banner = "Usage: sync_scholar.rb --profile ID --publications FILE --output FILE [options]"
  parser.on("--profile ID", "Google Scholar profile user id") { |value| options[:profile] = value }
  parser.on("--publications FILE", "Canonical publications YAML") { |value| options[:publications] = value }
  parser.on("--output FILE", "Generated Scholar sidecar YAML") { |value| options[:output] = value }
  parser.on("--min-year YEAR", Integer, "Only match publications from this year onward") { |value| options[:min_year] = value }
  parser.on("--max-year YEAR", Integer, "Only match publications through this year") { |value| options[:max_year] = value }
  parser.on("--max-pages COUNT", Integer, "Maximum 100-result Scholar pages") { |value| options[:max_pages] = value }
  parser.on("--html-dir DIR", "Read saved scholar-0.html, scholar-100.html, etc. instead of fetching") { |value| options[:html_dir] = value }
  parser.on("--minimum-coverage FRACTION", Float, "Fail below this title-match coverage") { |value| options[:minimum_coverage] = value }
  parser.on("--check", "Validate an existing sidecar without network access") { options[:check] = true }
  parser.on("--max-age DAYS", Integer, "Maximum sidecar age accepted by --check") { |value| options[:max_age] = value }
end.parse!

abort "--output is required" unless options[:output]

if options[:check]
  abort "Scholar sidecar not found: #{options[:output]}" unless File.file?(options[:output])

  sidecar = YAML.safe_load_file(options[:output], aliases: true)
  verified = Date.iso8601(sidecar.fetch("last_verified").to_s)
  age = (Date.today - verified).to_i
  papers = sidecar.fetch("papers")
  coverage = sidecar.fetch("coverage").to_f

  abort "Scholar sidecar papers must be a non-empty mapping" unless papers.is_a?(Hash) && !papers.empty?
  abort "Scholar sidecar is #{age} days old (maximum #{options[:max_age]})" if age > options[:max_age]
  abort "Scholar sidecar coverage #{coverage} is below #{options[:minimum_coverage]}" if coverage < options[:minimum_coverage]

  puts "Scholar sidecar passed: #{papers.length} papers, #{(coverage * 100).round(1)}% coverage, verified #{verified}."
  exit
end

abort "--profile is required" unless options[:profile]
abort "--publications is required" unless options[:publications]
abort "Publications file not found: #{options[:publications]}" unless File.file?(options[:publications])

def normalized_title(value)
  value.to_s
       .unicode_normalize(:nfkc)
       .downcase
       .gsub(/[δ𝛿]/u, "delta")
       .gsub(/[σςΣ]/u, "sigma")
       .gsub("&", "and")
       .gsub(/[^[:alnum:]]+/u, "")
end

def fetch_profile_page(profile, start)
  url = "https://scholar.google.com/citations?user=#{profile}&hl=en&pagesize=100&sortby=pubdate&cstart=#{start}"
  URI.open(url, "User-Agent" => DEFAULT_USER_AGENT, read_timeout: 20).read
rescue OpenURI::HTTPError => error
  abort "Scholar request failed at result #{start}: #{error.message}"
end

works = []
profile_citations = nil

options[:max_pages].times do |page_index|
  start = page_index * 100
  page_html = if options[:html_dir]
    File.binread(File.join(options[:html_dir], "scholar-#{start}.html"))
  else
    fetch_profile_page(options[:profile], start)
  end
  document = Nokogiri::HTML(page_html)
  # Scholar can declare ISO-8859-1 while using Unicode HTML entities. Normalize
  # extracted text to UTF-8 before comparing mathematical symbols and titles.
  document.encoding = "UTF-8"
  rows = document.css("tr.gsc_a_tr")
  abort "No Scholar records at result #{start}; existing sidecar was not changed" if rows.empty? && page_index.zero?

  if page_index.zero?
    profile_citations = document.at_css("#gsc_rsb_st .gsc_rsb_std")&.text.to_s.gsub(/[^0-9]/, "").to_i
  end

  rows.each do |row|
    title_node = row.at_css(".gsc_a_at")
    next unless title_node

    href = title_node["href"]
    works << {
      "title" => title_node.text.strip,
      "year" => row.at_css(".gsc_a_y")&.text.to_s[/\d{4}/]&.to_i,
      "citations" => row.at_css(".gsc_a_c a")&.text.to_s[/\d+/]&.to_i || 0,
      "scholar_url" => href ? "https://scholar.google.com#{href}" : nil
    }
  end

  break if rows.length < 100
  sleep 0.4 unless options[:html_dir]
end

scholar_by_title = works.group_by { |work| normalized_title(work["title"]) }

publications = YAML.safe_load_file(options[:publications], aliases: true)
abort "Publication data must be a YAML list" unless publications.is_a?(Array)

eligible = publications.select do |publication|
  year = publication["year"].to_i
  (!options[:min_year] || year >= options[:min_year]) &&
    (!options[:max_year] || year <= options[:max_year])
end

duplicate_titles = eligible.group_by { |publication| publication.fetch("title") }
                           .select { |_title, entries| entries.length > 1 }
abort "Duplicate publication titles: #{duplicate_titles.keys.join(', ')}" unless duplicate_titles.empty?

matched = {}
unmatched = []

eligible.each do |publication|
  lookup_title = publication["scholar_title"] || publication.fetch("title")
  candidates = scholar_by_title[normalized_title(lookup_title)]

  # Scholar sometimes omits a leading mathematical symbol rendered by
  # MathJax (for example the sigma in Sigma-Mem) from the row's text node.
  # Match the remaining title only when the full title did not resolve.
  unless candidates
    normalized = normalized_title(lookup_title)
    without_leading_symbol = normalized.sub(/\A(?:sigma|delta)/, "")
    candidates = scholar_by_title[without_leading_symbol] if without_leading_symbol != normalized
  end
  # Repeated patent titles and reprints are not interchangeable. Prefer the
  # archive's year before falling back to the highest-cited dated record.
  scholar_work = candidates&.max_by do |work|
    [work["year"] == publication["year"] ? 1 : 0, work["year"] ? 1 : 0, work["citations"]]
  end

  unless scholar_work
    unmatched << publication.fetch("title")
    next
  end

  matched[publication.fetch("title")] = {
    "citations" => scholar_work.fetch("citations"),
    "scholar_url" => scholar_work.fetch("scholar_url"),
    "scholar_title" => scholar_work.fetch("title")
  }
end

coverage = eligible.empty? ? 1.0 : matched.length.fdiv(eligible.length)
sidecar = {
  "profile_url" => "https://scholar.google.com/citations?user=#{options[:profile]}&hl=en",
  "profile_citations" => profile_citations,
  "last_verified" => Date.today.iso8601,
  "publication_count" => eligible.length,
  "matched_publications" => matched.length,
  "coverage" => coverage.round(4),
  "papers" => matched
}

puts "Scholar refresh: #{matched.length}/#{eligible.length} papers matched (#{(coverage * 100).round(1)}%)."
unless unmatched.empty?
  warn "Unmatched local titles:"
  unmatched.each { |title| warn "  - #{title}" }
end

exit 1 if coverage < options[:minimum_coverage]

FileUtils.mkdir_p(File.dirname(options[:output]))
File.write(options[:output], YAML.dump(sidecar))
