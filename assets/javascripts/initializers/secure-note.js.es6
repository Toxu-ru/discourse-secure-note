import { withPluginApi } from 'discourse/lib/plugin-api';
import { ajax } from 'discourse/lib/ajax';
import { postMenuWidget } from 'discourse/widgets/post-menu';
import showModal from 'discourse/lib/show-modal';

export default {
  name: "secure-note",

  initialize() {
    withPluginApi('0.1', api => {

      const siteSettings = api.container.lookup('site-settings:main');

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
       * Send Secure Note button clicks to our controller
       */

      api.reopenWidget('post-menu', {
        secureNoteOpenModal() {
          this.register.lookup('controller:secure-note').send('openModal', this.attrs);
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

        function displaySecureNote( cooked, disclaimer ) {

          let footerMessage = I18n.t('secure_note.disclaimer.template', {
            allowed: I18n.t(`secure_note.disclaimer.${disclaimer}`)
          } );

          return api.h('div.cooked.secure-note', [
            api.h('div.secure-note-header', api.h('span', { innerHTML: I18n.t('secure_note.post.title') } ) ),
            api.h('div.secure-note-contents', { innerHTML: cooked } ),
            api.h('div.secure-note-footer', api.h('span', { innerHTML: footerMessage } ) ),
          ]);

        }

        function getDisclaimerWithTopicOwner( attrs, user ) {

          let disclaimer = 'is_op_with_topic_owner';
          let userIsPostOwner = attrs.user_id == user.id;
          let userIsTopicOwner = attrs.topicCreatedById == user.id;

          if ( userIsTopicOwner ) {
            disclaimer = 'is_op';
          }

          if ( user.staff ) {

            disclaimer = 'is_staff_with_topic_owner';

            if ( userIsPostOwner ) {
              disclaimer = 'is_staff_and_op_with_topic_owner';
            }

            if ( userIsTopicOwner ) {
              disclaimer = 'is_staff_and_op';
            }
          }

          return disclaimer;
        }

        function getDisclaimer( attrs, user ) {

          let disclaimer = 'is_op';

          let userIsPostOwner = attrs.user_id == user.id;

          if ( user.staff ) {

            disclaimer = 'is_staff_and_op';

            if ( ! userIsPostOwner ) {
              disclaimer = 'secure_note.disclaimer.is_staff';
            }

          }

          return disclaimer;

        }

        let disclaimerHandler = siteSettings.secure_note_include_topic_owner ? getDisclaimerWithTopicOwner : getDisclaimer;
        return displaySecureNote( attrs.secure_note.cooked, disclaimerHandler( attrs, api.getCurrentUser() ) );

      });

    });
  }
};
