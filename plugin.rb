# name: discourse-secure-note
# about: Allow the attachment of secure notes to posts that are visible to staff and the post owner.
# version: 0.1
# authors: Alexander Rohmann
# url:

enabled_site_setting :secure_note_enabled

register_asset "stylesheets/common/secure-note.scss"

PLUGIN_NAME ||= "discourse_secure-note".freeze

after_initialize do

  module ::DiscourseSecureNote

    NOTE_CUSTOM_FIELD ||= "secure-note".freeze

    class Engine < ::Rails::Engine
      engine_name PLUGIN_NAME
      isolate_namespace DiscourseSecureNote
    end

  end

  require_dependency "application_controller"

  class DiscourseSecureNote::SecureNoteController < ::ApplicationController
    requires_plugin PLUGIN_NAME

    before_filter :ensure_logged_in

    def update

      post_id = params.require(:post_id)
      raw     = params[:raw]

      post = Post.find_by(id: post_id)
      raise Discourse::InvalidParameters.new("Invalid post") if !post
      raise Discourse::InvalidAccess.new unless current_user && ( post.user_id == current_user.id || current_user.staff? )

      secure_note = {
        raw: raw,
        cooked: PrettyText.cook(raw)
      }

      post.custom_fields[DiscourseSecureNote::NOTE_CUSTOM_FIELD] = secure_note
      post.save_custom_fields(true)

      render json: secure_note

    end

  end

  DiscourseSecureNote::Engine.routes.draw do
    put "/update" => "secure_note#update"
  end

  Discourse::Application.routes.append do
    mount ::DiscourseSecureNote::Engine, at: "/secure-note"
  end

  Post.register_custom_field_type(DiscourseSecureNote::NOTE_CUSTOM_FIELD, :json)

  TopicView.add_post_custom_fields_whitelister do |user|
    user ? [DiscourseSecureNote::NOTE_CUSTOM_FIELD] : []
  end

  add_to_serializer(:post, :secure_note, false) do
    post_custom_fields[DiscourseSecureNote::NOTE_CUSTOM_FIELD]
  end

  add_to_serializer(:post, :include_secure_note?) do
    return unless post_custom_fields.present?
    return unless post_custom_fields[DiscourseSecureNote::NOTE_CUSTOM_FIELD].present?
    scope.user.id == user_id || scope.user.moderator || scope.user.admin
  end

end
