import showModal from 'discourse/lib/show-modal';
import { ajax } from 'discourse/lib/ajax';

export default Ember.Controller.extend({
  postAttrs: null,

  disableSave: Ember.computed('saving', function() {
    return this.get('saving');
  }),

  disclaimer: Ember.computed(function(){
    let mode = I18n.t('secure_note.disclaimer.is_op');
    return I18n.t('secure_note.disclaimer.template', { allowed: mode });
  }),

  saveButtonLabel: Ember.computed('saving', function() {
    let message = this.get('saving') ? 'saving' : 'save';
    return `secure_note.modal.${message}_button_title`;
  }),

  updateSecureNote() {
    return ajax("/secure-note/update", {
            type: "PUT",
            data: {
              post_id: this.get('postId'),
              raw: this.get('rawNote')
            }
          });
  },

  actions: {
    openModal( attrs ) {

      this.setProperties({
        saving: false,
        postId: null,
        rawNote: ''
      });

      this.set('postId', attrs.id );
      this.set('rawNote', attrs.secure_note && attrs.secure_note.raw ? attrs.secure_note.raw : '' )
      showModal("secure-note");

    },

    saveSecureNote() {

      this.set('saving', true);
      this.updateSecureNote().then(( response) => {

        // this.set('saving', false);
        // this.send("closeModal");
        window.location.reload();
      }).catch( error => {
        this.set('saving', false);
        console.warn(error);
      });

    }
  }
});
