require_relative "lib/lexxy/comments/version"

Gem::Specification.new do |spec|
  spec.name        = "lexxy-comments"
  spec.version     = Lexxy::Comments::VERSION
  spec.authors     = [ "fabian" ]
  spec.email       = [ "fabian@nz.systems" ]
  spec.summary     = "Inline comments for the Lexxy rich text editor, stored by your Rails app"
  spec.description = "Lexxy extensions that wrap commented text in <mark> elements and leave storing the comments to the host application. Also ships a read-only comment mode."
  spec.required_ruby_version = ">= 3.2"

  spec.files = Dir["{app,config,lib}/**/*", "README.md"]

  spec.add_dependency "lexxy", ">= 1.0.3"
  spec.add_dependency "importmap-rails", ">= 2.0"
  spec.add_dependency "railties", ">= 8.0.2"
end
