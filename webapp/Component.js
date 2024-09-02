sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"ZTM_EVENT_APPROVAL/model/models"
], function(UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("ZTM_EVENT_APPROVAL.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
		}
	});
});