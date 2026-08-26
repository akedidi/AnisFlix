require 'xcodeproj'
project_path = 'ios-natve/anisflix/anisflix.xcodeproj'
project = Xcodeproj::Project.open(project_path)
group = project.main_group['anisflix']['Services']
file_ref = group.new_reference('HiAnimeService.swift')
target = project.targets.first
target.add_file_references([file_ref])
project.save
