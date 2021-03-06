'use strict';

yeomanApp.factory('ZoneFactory'
  , [ '$rootScope', '$http', 'UIEvents', 'NinjaUtilities', 'TriggerFactory'
  , function( $rootScope, $http, UIEvents, NinjaUtilities, TriggerFactory) {

    /**
     * Zone object. Instantiate with new Zone()
     */
    return function(options) {

      this.id = null;

      this.Triggers = [];

      this.Options = {
        name: '',
        triggers: {},
        externalActivate: '',
        externalDeactivate: '',
        // activeTimes: [],
        overrideActive: true,       // Array of Device Id's
        webcams: []                 // Array of assigned webcams
      };

      this.Options = NinjaUtilities.ObjectMerge(this.Options, options);

      var normalize = function() {
        if (this.Options.id) {
          this.id = this.Options.id;
          delete this.Options.id;
        }

        if (this.Options.triggers) {
          var triggers = NinjaUtilities.ObjectArrayToArray(this.Options.triggers, 'data');

          for(var i=0; i<triggers.length; i++) {
            var triggerOptions = triggers[i];
            triggerOptions.zone = this;
            var trigger = new TriggerFactory(triggerOptions);
            this.Triggers.push(trigger);
          }

          delete this.Options.triggers;

        }
      }.bind(this);
      normalize();

      /**
       * Save/Update this zone
       */
      this.Save = function(callback) {
        if (DEBUG) console.log("Zone.Save()");
        if (this.id) {
          // Exists. Update only
          $http.put('/zone/' + this.id, this.Options, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json'} }).success(function(response) {
            if (DEBUG) console.log('SaveZone Existing:', response);

            $rootScope.$broadcast(UIEvents.ZoneUpdated, this);

            if (callback) {
              callback(response);
            }
          });
        } else {
          // Create new
          $http.post('/zone', this.Options, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json'} }).success(function(response) {
            if (DEBUG) console.log('SaveZone New:', response);

            //Set the id
            this.id = response.id;

            $rootScope.$broadcast(UIEvents.ZoneAdded, this);

            if (callback) {
              callback(response);
            }
          }.bind(this));
        }
      };

      /**
       * Delete this zone
       */
      this.Delete = function(callback) {
        if (this.id) {
          $http.delete('/zone/' + this.id).success(function(response) {
            if (DEBUG) console.log("DeleteZone:", response, this);
            // Broadcast event that zone was removed
            $rootScope.$broadcast(UIEvents.ZoneRemoved, this);

            if (callback) {
              callback(response);
            }
          }.bind(this));
        }
      };

      /**
       * Refresh the data for this zone from the API
       */
      this.Refresh = function(callback) {
        if (this.id) {
          $http.get('/zone/' + this.id).success(function(response) {
            if (DEBUG) console.log('GetZone:', response);
            if (callback) {
              callback(response);
            }
          });
        }
      };



      /**
       * Determines if a trigger is already in the Triggers array
       * @param {Trigger} trigger Trigger to search for
       */
      this.HasTrigger = function(trigger) {
        var found = false;

        for(var i=0; i<this.Triggers.length; i++) {
          var triggerItem = this.Triggers[i];
          if (triggerItem.Options.data === trigger.Options.data) {
            found = true;
            break;
          }
        }

        return found;
      };

      /**
       * Sets the arm override for this zone
       * @param {bool|null} value Override value to set
       */
      this.SetOverride = function(value) {

        var data = {
          overrideActive: value
        };

        $http.put('/zone/' + this.id, data).success(function(response) {
          this.Options.overrideActive = value;
          if (DEBUG) console.log("Zone.SetOverride", value);
        }.bind(this));
      };

      /**
       * Checks if the webcam device is in the list
       * @param {Device} webcam Webcam device object
       */
      this.HasWebcam = function(webcam) {
        var webcamGuid = webcam.GUID();

        var hasWebcam = this.Options.webcams.indexOf(webcamGuid) >= 0;

        return hasWebcam;
      };


      /**
       * Checks if any webcams are available
       */
      this.HasAnyWebcam = function() {
        return this.Options.webcams.length >= 1;
      };

      /**
       * Removes a webcam guid from the Options.webcams array
       * @param {Device} webcam Webcam device to remove
       */
      this.RemoveWebcam = function(webcam) {

        var webcamGuid = webcam.GUID();

        var removeIndex = this.Options.webcams.indexOf(webcamGuid);

        if (removeIndex >=0) {
          this.Options.webcams.splice(removeIndex, 1);
        }

      };

      /**
       * Event Watchers
       */
      $rootScope.$on(UIEvents.TriggerRemoved, function(event, trigger) {
        if (this.id === trigger.Zone.id) {
          if (DEBUG) console.log("TriggerRemoved:", trigger);
          var removeIndex = this.Triggers.indexOf(trigger);
          console.log("Removing Trigger ", removeIndex);
          this.Triggers.splice(removeIndex, 1);
          $rootScope.$watch();
        }

      }.bind(this));

      $rootScope.$on(UIEvents.TriggerAdded, function(event, trigger) {
        if (this.id === trigger.Zone.id) {
          if (DEBUG) console.log("TriggerAdded:", trigger);
          if (!this.HasTrigger(trigger)) {
            this.Triggers.push(trigger);
            $rootScope.$watch();
          }
        }

      }.bind(this));


      return this;
    };

}]);