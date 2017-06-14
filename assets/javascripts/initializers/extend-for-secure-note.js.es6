import { withPluginApi } from 'discourse/lib/plugin-api';
import { ajax } from 'discourse/lib/ajax';
import { postMenuWidget } from 'discourse/widgets/post-menu';
import showModal from 'discourse/lib/show-modal';

export default {
  name: "secure-note",

  initialize() {
    withPluginApi('0.1', api => {

      // Function we can call in the console to play around before building the UD
      window.updateSecureNote = function( post_id, raw ) {
        ajax("/secure-note/update", {
                type: "PUT",
                data: { post_id, raw }
              }).then(( response) => {
                console.log( response)
              }).catch( error => console.warn(error) );
      }

      /**
       * Add "Secure Note" button to post menu
       */

      api.addPostMenuButton('secure-note', (attrs, state, siteSettings) => {

        let user = api.getCurrentUser();

        if ( ! user ) {
          return;
        }

        if ( attrs.user_id === user.id) {
          return {
            action: 'secureNoteOpenModal',
            icon: siteSettings.secure_note_post_button_icon || 'key',
            className: 'secure-note create fade-out',
            title: 'secure_note.post.button_title',
            label: 'secure_note.post.button_title',
            position: siteSettings.secure_note_post_button_placement || 'last'
          };
        } else if ( user.staff ) {
          return {
            action: 'secureNoteOpenModal',
            icon: siteSettings.secure_note_post_button_icon || 'key',
            className: 'secure-note',
            title: 'secure_note.post.button_title',
            position: 'second-last-hidden'
          };
        }

      });

      /**
       * Send Secure Note button clicks to a Topic Controller action.
       */

      api.reopenWidget('post-menu', {
        secureNoteOpenModal() {
          this.register.lookup('controller:secure-note').send('openModal', this.attrs);
        }
      });


      const TopicController = api.container.lookupFactory('controller:topic');
      TopicController.reopen({
        actions: {
          secureNoteOpenModal(attrs) {
            showModal("topic", attrs);
          }
        }
      });


      /**
       * Display Secure note after cooked content
       */

      api.includePostAttributes("secure_note");

      api.decorateWidget('post-contents:after-cooked', ( { attrs } ) => {

        if ( ! attrs.secure_note || ! attrs.secure_note.cooked ) {
          return;
        }

        function displaySecureNote( cooked, footerMessage ) {
          return api.h('div.cooked.secure-note', [
            api.h('div.secure-note-header', api.h('span', { innerHTML: I18n.t('secure_note.post.title') } ) ),
            api.h('div.secure-note-contents', { innerHTML: cooked } ),
            api.h('div.secure-note-footer', api.h('span', { innerHTML: footerMessage } ) ),
          ]);
        }

        function getFooterMessage( attrs, user ) {

          let footerMessage = 'secure_note.disclaimer.is_op';

          if ( user.staff ) {

            footerMessage = 'secure_note.disclaimer.is_staff_and_op';

            if ( attrs.user_id != user.id ) {
              footerMessage = 'secure_note.disclaimer.is_staff';
            }

          }

          return I18n.t('secure_note.disclaimer.template', { allowed: I18n.t(footerMessage) });

        }

        return displaySecureNote( attrs.secure_note.cooked, getFooterMessage( attrs, api.getCurrentUser() ) );

      });

    });
  }
};
