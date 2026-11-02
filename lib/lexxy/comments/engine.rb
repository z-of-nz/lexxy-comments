module Lexxy
  module Comments
    class Engine < ::Rails::Engine
      initializer "lexxy_comments.importmap", before: "importmap" do |app|
        app.config.importmap.paths << root.join("config/importmap.rb")
        app.config.importmap.cache_sweepers << root.join("app/assets/javascript")
      end
    end
  end
end
