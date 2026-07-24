#!/usr/bin/env ruby

require "bundler/setup"
require "nokogiri"
require "pathname"
require "uri"

site_root = Pathname(ARGV.fetch(0, "_site")).expand_path
errors = []
checked_links = 0
checked_images = 0

abort "Built site not found: #{site_root}" unless site_root.directory?

def local_reference?(value)
  return false if value.nil? || value.empty? || value.start_with?("//")

  URI.parse(value).scheme.nil?
rescue URI::InvalidURIError
  true
end

def local_target(site_root, html_file, raw_path)
  path = URI::DEFAULT_PARSER.unescape(raw_path.to_s.split(/[?#]/, 2).first)
  return nil if path.empty?

  candidate = if path.start_with?("/")
                site_root.join(path.delete_prefix("/"))
              else
                html_file.dirname.join(path)
              end

  candidates = [candidate]
  candidates << candidate.join("index.html") if path.end_with?("/") || candidate.extname.empty?
  candidates << Pathname("#{candidate}.html") if candidate.extname.empty?
  candidates.find(&:file?)
end

html_files = site_root.glob("**/*.html")

html_files.each do |html_file|
  document = Nokogiri::HTML5(html_file.read)
  page_name = html_file.relative_path_from(site_root).to_s

  if document.at_css(".site-header")
    core_scripts = document.css('script[src*="/assets/declare-core/js/site.js"]')
    errors << "#{page_name}: shared design script must be loaded exactly once" unless core_scripts.length == 1
  end

  ids = document.css("[id]").map { |node| node["id"] }.reject(&:empty?)
  ids.tally.each do |id, count|
    errors << "#{page_name}: duplicate id ##{id}" if count > 1
  end

  document.css("img").each do |image|
    checked_images += 1
    src = image["src"]
    next unless local_reference?(src)

    errors << "#{page_name}: missing image #{src}" unless local_target(site_root, html_file, src)
  end

  document.css("a[href]").each do |link|
    href = link["href"]
    next unless local_reference?(href)

    checked_links += 1
    path, fragment = href.split("#", 2)
    target_file = path.nil? || path.empty? ? html_file : local_target(site_root, html_file, path)

    unless target_file
      errors << "#{page_name}: missing local link #{href}"
      next
    end

    next if fragment.nil? || fragment.empty? || target_file.extname.downcase != ".html"

    target_document = target_file == html_file ? document : Nokogiri::HTML5(target_file.read)
    decoded_fragment = URI::DEFAULT_PARSER.unescape(fragment)
    unless target_document.css("[id]").any? { |node| node["id"] == decoded_fragment }
      errors << "#{page_name}: missing anchor #{href}"
    end
  end

  document.css("[data-section-menu] a[href^='#']").each do |link|
    fragment = URI::DEFAULT_PARSER.unescape(link["href"].delete_prefix("#"))
    unless document.css("[id]").any? { |node| node["id"] == fragment }
      errors << "#{page_name}: section menu points to missing ##{fragment}"
    end
  end

  document.css("[data-section-menu]").each do |menu|
    classes = menu["class"].to_s.split
    variants = classes & %w[section-menu--rail section-menu--inline]
    errors << "#{page_name}: section menu must inherit the shared component" unless classes.include?("section-menu")
    errors << "#{page_name}: section menu must declare one structural variant" unless variants.length == 1
    next unless variants.include?("section-menu--rail")

    errors << "#{page_name}: rail menu is missing its shared label" unless menu.at_css(".section-menu__label")
    errors << "#{page_name}: rail menu is missing its shared item container" unless menu.at_css(".section-menu__items[data-section-menu-scroll]")
  end
end

puts "Audited #{html_files.length} HTML pages, #{checked_images} images, and #{checked_links} local links."

if errors.any?
  warn "Site audit found #{errors.length} issue#{errors.length == 1 ? '' : 's'}:"
  errors.each { |error| warn "  - #{error}" }
  exit 1
end

puts "Site audit passed."
