require "minitest/autorun"
require "tmpdir"
require "open3"
require "yaml"
require "rbconfig"

class ScholarSyncTest < Minitest::Test
  SCRIPT = File.expand_path("sync_scholar.rb", __dir__)

  def row(title, year, citations, id)
    '<tr class="gsc_a_tr"><td><a class="gsc_a_at" href="/citations?citation_for_view=test:'+id+'">'+title+'</a></td><td class="gsc_a_y">'+year.to_s+'</td><td class="gsc_a_c"><a>'+citations.to_s+'</a></td></tr>'
  end

  def run_sync(dir)
    Open3.capture3(RbConfig.ruby, SCRIPT, "--profile", "test", "--publications", "#{dir}/pubs.yml", "--output", "#{dir}/out.yml", "--html-dir", dir)
  end

  def test_unicode_and_year_specific_matches
    Dir.mktmpdir do |dir|
      File.write("#{dir}/pubs.yml", YAML.dump([{ "title" => "δ-mem: A title", "year" => 2026 }, { "title" => "Repeated title", "year" => 2025 }]))
      rows = row('&#120575;-mem: A&nbsp;title', 2026, 6, 'unicode') + row('Repeated title', 2021, 50, 'old') + row('Repeated title', 2025, 2, 'current')
      File.write("#{dir}/scholar-0.html", '<html><meta charset="ISO-8859-1"><table>'+rows+'</table></html>')
      _, error, status = run_sync(dir)
      assert status.success?, error
      papers = YAML.safe_load_file("#{dir}/out.yml").fetch("papers")
      assert_equal 6, papers.fetch("δ-mem: A title").fetch("citations")
      assert_equal 2, papers.fetch("Repeated title").fetch("citations")
      assert_match(/:current$/, papers.fetch("Repeated title").fetch("scholar_url"))
    end
  end

  def test_empty_or_unmatched_snapshot_does_not_replace_existing_data
    Dir.mktmpdir do |dir|
      File.write("#{dir}/pubs.yml", YAML.dump([{ "title" => "A paper", "year" => 2026 }]))
      File.write("#{dir}/out.yml", "existing snapshot\n")
      ['<html>Access denied</html>', '<table>'+row('Unrelated paper', 2026, 1, 'wrong')+'</table>'].each do |page|
        File.write("#{dir}/scholar-0.html", page)
        _, _, status = run_sync(dir)
        refute status.success?
        assert_equal "existing snapshot\n", File.read("#{dir}/out.yml")
      end
    end
  end
end
