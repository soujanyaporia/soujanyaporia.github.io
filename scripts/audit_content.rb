#!/usr/bin/env ruby

require "bundler/setup"
require "nokogiri"
require "pathname"

site_root = Pathname(ARGV.fetch(0, "_site")).expand_path
abort "Built site not found: #{site_root}" unless site_root.directory?

issues = []
pages_checked = 0
sections_checked = 0
paragraphs = Hash.new { |hash, key| hash[key] = [] }

def normalized_text(node)
  node.text.gsub(/\s+/, " ").strip
end

def normalized_key(text)
  text.downcase.gsub(/[^\p{Alnum}\s]/, " ").gsub(/\s+/, " ").strip
end

def object_count(node)
  selector = [
    "article",
    "table",
    "ul",
    "ol",
    ".research-work",
    ".activity-record",
    ".pub-card",
    ".research-support-list",
    ".award-grid"
  ].join(",")

  count = node.element? && node.matches?(selector) ? 1 : 0
  count + node.css(selector).length
end

site_root.glob("**/*.html").sort.each do |html_file|
  document = Nokogiri::HTML5(html_file.read)
  content = document.at_css(".content-text")
  next unless content

  pages_checked += 1
  page_name = html_file.relative_path_from(site_root).to_s
  headings = content.css("h2").map { |heading| normalized_text(heading) }

  headings.map(&:downcase).tally.each do |heading, count|
    issues << "#{page_name}: repeated section heading '#{heading}'" if count > 1
  end

  if page_name == "index.html"
    menu_count = content.css("[data-section-menu]").length
    issues << "#{page_name}: landing page has #{headings.length} content sections; keep at most 2" if headings.length > 2
    if headings.length <= 2 && menu_count.positive?
      issues << "#{page_name}: section navigation is unnecessary for #{headings.length} content section(s)"
    end

    action_count = content.css(".btn-primary, .btn-secondary, .lab-link, .lab-link-secondary").length
    issues << "#{page_name}: #{action_count} prominent actions overload the landing page" if action_count > 4
  end

  content.css("p").each do |paragraph|
    text = normalized_text(paragraph)
    key = normalized_key(text)
    paragraphs[key] << page_name if key.split.length >= 12
  end

  children = content.element_children.to_a
  heading_positions = children.each_index.select { |index| children[index].name == "h2" }

  heading_positions.each_with_index do |position, heading_index|
    sections_checked += 1
    finish = heading_positions.fetch(heading_index + 1, children.length)
    section_nodes = children[(position + 1)...finish]
    section_text = section_nodes.map { |node| normalized_text(node) }.join(" ")
    words = normalized_key(section_text).split.length
    objects = section_nodes.sum { |node| object_count(node) }
    heading = normalized_text(children[position])

    if words < 12 && objects.zero?
      issues << "#{page_name}: '#{heading}' is a shallow section (#{words} words, no substantive object)"
    end

    if page_name != "publications/index.html" && objects > 12
      issues << "#{page_name}: '#{heading}' contains #{objects} repeated objects and may overload readers"
    end
  end
end

paragraphs.each do |text, pages|
  distinct_pages = pages.uniq
  next unless distinct_pages.length > 1

  excerpt = text.split.first(14).join(" ")
  issues << "Repeated prose across #{distinct_pages.join(', ')}: '#{excerpt}...'"
end

puts "Content audit: #{pages_checked} pages, #{sections_checked} sections, #{paragraphs.length} substantial paragraphs."

if issues.any?
  warn "Content audit found #{issues.length} issue#{issues.length == 1 ? '' : 's'}:"
  issues.each { |issue| warn "  - #{issue}" }
  exit 1
end

puts "Content audit passed: no duplicate prose, shallow sections, redundant landing navigation, or overloaded section structures."
