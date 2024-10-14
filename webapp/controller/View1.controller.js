sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/Fragment", "sap/m/MessageBox"],
  function (Controller, Fragment, MessageBox) {
    "use strict";

    return Controller.extend("ZTM_EVENT_APPROVAL.controller.View1", {
      pDialog: null,
      _bErrorDisplayed: false,

      /* View 1 */
      onInit: function () {
        this._oModel = this.getOwnerComponent().getModel();
        this.getView().setModel(this._oModel);

        // Attach handler to the requestSent and requestFailed events
        this._oModel.attachRequestSent(this._onRequestCompleted, this);
        this._oModel.attachRequestFailed(this._onRequestFailed, this);

        /*
        var oSmartTable = this.getView().byId("table001");

        // Add a handler for the "dataReceived" event (to keep data on selection for oData)
        oSmartTable.attachDataReceived(function (oEvent) {
          var oSmartTable = oEvent.getSource();
          var oTable = oSmartTable.getTable();
          var aColumns = oTable.getColumns();

          // Hide the "EvtReasonDesc" column in the table
          aColumns.forEach(function (oColumn) {
            var oCustomData = oColumn.getAggregation("customData")[0];
            if (
              oColumn.getCustomData()[0] &&
              oColumn.getCustomData()[0].getValue().columnKey ===
                "EvtReasonDesc"
            ) {
              oColumn.setVisible(false); // Hide column EvtReasonDesc
            }
          });
        });*/
      },
      onBeforeRebindTable: function (oEvent) {
        // Define tree expansion (Level 2)
        var oBindingParams = oEvent.getParameter("bindingParams");
        oBindingParams.parameters.numberOfExpandedLevels = 2;

        // Get actual server URL and SAP-Client
        var sCurrentUrl = window.location.href;
        var oUrl = new URL(sCurrentUrl);
        var sServerAndPort = oUrl.origin;
        var sClient = oUrl.searchParams.get("sap-client");
        if (!sClient) {
          sClient = "100"; // Defaulted for PRD
        }

        // Table preparation for column link
        var oSmartTable = oEvent.getSource();
        var oTable = oSmartTable.getTable();
        var aColumns = oTable.getColumns();
        var i = 0;

        aColumns.forEach(function (oColumn) {
          var oCustomData = oColumn.getAggregation("customData")[0];

          // Resize columns manually
          if (oCustomData) {
            switch (oCustomData.getValue().columnKey) {
              case "TorId":
                oColumn.setWidth("180px");
                break;
              case "Tspid":
                oColumn.setWidth("180px");
                break;
              case "ResId":
                oColumn.setWidth("150px");
                break;
              case "GroWeiVal":
                oColumn.setWidth("120px");
                break;
              case "EvtId":
                oColumn.setWidth("0px"); //Need to hide, key for events
                break;
              case "EvtLocName":
                oColumn.setWidth("180px");
                break;
              case "EvtDescription":
                oColumn.setWidth("300px");
                break;
              case "EvtReason":
                oColumn.setWidth("130px");
                break;
              case "EvtStatus":
                oColumn.setWidth("200px");
                break;
              case "ApprovedBy":
                oColumn.setWidth("120px");
                break;
              case "ApprovedOn":
                oColumn.setWidth("180px");
                break;
            }
          }

          //oColumn.getParent().autoResizeColumn(i); //Have a limitation just after first load
          //i++;

          // Convert column to Link to Freight Order Display
          if (oCustomData && oCustomData.getValue().columnKey === "TorId") {
            oColumn.setTemplate(
              new sap.m.Link({
                text: "{TorId}",
                press: function (oInnerEvent) {
                  var oBindingContext = oInnerEvent
                    .getSource()
                    .getBindingContext();
                  var oModel = oBindingContext.getModel();
                  var sTorId = oBindingContext.getProperty("TorId");

                  // Perform OData request to get RootKey using TorId
                  oModel.read("/TorUUIDSet('" + sTorId + "')", {
                    success: function (oData) {
                      var sRootKey = oData.RootKey;
                      var sUrl =
                        sServerAndPort +
                        "/sap/bc/ui2/flp?#FreightOrder-display?SkipInitialScreen=X&TransportationOrderUUID=" +
                        sRootKey +
                        "&category=TO&sap-client=" +
                        sClient +
                        "&sap-app-origin-hint=WDA";
                      window.open(sUrl, "_blank");
                    },
                    error: function (oError) {
                      console.error("Error reading data: ", oError);
                    },
                  });
                },
              })
            );
          }

          // Convert column to ObjectStatus to show with collors on Event Status
          if (oCustomData && oCustomData.getValue().columnKey === "EvtStatus") {
            oColumn.setTemplate(
              new sap.m.ObjectStatus({
                text: "{EvtStatus}",
                state: {
                  path: "EvtStatus",
                  formatter: function (sValue) {
                    if (sValue === "Approved") {
                      return "Success";
                    } else if (sValue === "Not Approved") {
                      return "Error";
                    } else {
                      return "None";
                    }
                  },
                },
                inverted: true,
                active: {
                  path: "EvtStatus",
                  formatter: function (sValue) {
                    return sValue === "Not Approved";
                  },
                },
              })
            );
          }

          // Convert column to ApprovedOn to show with formatted date
          if (
            oCustomData &&
            oCustomData.getValue().columnKey === "ApprovedOn"
          ) {
            oColumn.setTemplate(
              new sap.m.Text({
                text: {
                  path: "ApprovedOn",
                  formatter: function (sDate) {
                    if (!sDate || sDate === "0" || sDate === "0 ") {
                      return ""; // No data? Empty
                    }

                    var oFormattedDate = new Date(
                      sDate.substring(0, 4),
                      sDate.substring(4, 6) - 1,
                      sDate.substring(6, 8),
                      sDate.substring(8, 10),
                      sDate.substring(10, 12),
                      sDate.substring(12, 14)
                    );
                    var oDateFormat =
                      sap.ui.core.format.DateFormat.getDateTimeInstance({
                        pattern: "dd/MM/yyyy hh:mm:ss a",
                      });
                    return oDateFormat.format(oFormattedDate);
                  },
                },
              })
            );
          }
        });
      },
      _onRequestFailed: function (oEvent) {
        // If an error message is already displayed, don't show it again
        if (this._bErrorDisplayed) {
          return;
        }

        // Get the error parameters from the event
        var oParams = oEvent.getParameters();
        var sMessage = this._extractErrorMessage(
          oParams.response.responseText,
          oParams.response.headers["Content-Type"]
        );

        // Display the error message in a popup
        MessageBox.error("Error: " + sMessage, {
          title: "Error",
          onClose: function () {
            // When the popup is closed, allow future error messages to be displayed
            this._bErrorDisplayed = false;
          }.bind(this),
        });

        // Set the control variable to true to prevent duplicate messages
        this._bErrorDisplayed = true;
      },
      _onRequestCompleted: function (oEvent) {
        // If the request is successful, reset the error display flag
        var oParams = oEvent.getParameters();
        if (oParams.success) {
          this._bErrorDisplayed = false; // Reset error flag on successful completion
        }
      },
      _extractErrorMessage: function (responseText, contentType) {
        // Try to parse JSON or XML to extract meaningful error messages
        try {
          // Handle JSON response
          if (contentType && contentType.includes("application/json")) {
            var oErrorResponse = JSON.parse(responseText);

            // Check for errordetails inside innererror and ensure it has elements
            if (
              oErrorResponse.error &&
              oErrorResponse.error.innererror &&
              oErrorResponse.error.innererror.errordetails &&
              oErrorResponse.error.innererror.errordetails.length > 0
            ) {
              return oErrorResponse.error.innererror.errordetails[0].message;
            }

            // Fallback to main message if no errordetails
            if (
              oErrorResponse.error &&
              oErrorResponse.error.message &&
              oErrorResponse.error.message.value
            ) {
              return oErrorResponse.error.message.value;
            }
          }

          // Handle XML response
          if (contentType && contentType.includes("application/xml")) {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(responseText, "text/xml");

            // Extract the message tag value
            var messageNode = xmlDoc.getElementsByTagName("message")[0];
            if (messageNode) {
              return messageNode.textContent; // Return the message content
            }
          }

          // If no specific message is found, return a generic message
          return "An unknown error occurred.";
        } catch (e) {
          // If parsing fails, return the responseText as fallback
          return responseText || "Error parsing the response.";
        }
      },
      onBeforeExport: function (oEvent) {
        // Default worked as false
        var mSettings = oEvent.getParameter("exportSettings");
        mSettings.worker = false;
      },
      onRefresh: function (oEvent) {
        // Reload Model
        var oModel = this.getView().getModel();
        var oSmartTable = this.getView().byId("table001");
        oSmartTable.rebindTable();
        oModel.refresh();
      },
      onApproved: async function (oEvent) {
        var that = this;
        var sError = false;
        var sBatchGroupId = "Approved";
        var sEntitySet = "/ActionsSet";
        var sPath = sEntitySet + "(NodeID=6)"; // Approved = 6
        var oSmartTable = this.byId("table001");
        var oTable = oSmartTable.getTable();
        var aSelectedIndices = oTable.getSelectedIndices();

        // Check if there are any selected indices
        if (aSelectedIndices.length === 0) {
          MessageBox.error("Select at least one line");
          return;
        }

        // Required create a new Model
        var oModel = new sap.ui.model.odata.v2.ODataModel(
          this.getOwnerComponent().getModel().sServiceUrl,
          true
        );

        oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
        oModel.setUseBatch(true);
        oModel.setDeferredGroups([sBatchGroupId]);

        var aPromises = aSelectedIndices.map(function (iIndex) {
          var oBindingContext = oTable.getContextByIndex(iIndex);
          if (oBindingContext) {
            var oItem = oBindingContext.getObject();
            var oUpdateItem = {
              NodeID: oItem.NodeID,
              HierarchyLevel: oItem.HierarchyLevel,
              ParentNodeID: oItem.ParentNodeID,
              DrillState: oItem.DrillState,
              TorId: oItem.TorId,
              Tspid: oItem.Tspid,
              ResId: oItem.ResId,
              Driver: oItem.Driver,
              GroWeiVal: oItem.GroWeiVal,
              EvtId: oItem.EvtId,
              EvtLocName: oItem.EvtLocName,
              EvtDescription: oItem.EvtDescription,
              EvtReason: oItem.EvtReason,
              //EvtReasonDesc: oItem.EvtReasonDesc,
              EvtStatus: oItem.EvtStatus,
              ApprovedBy: oItem.ApprovedBy,
              ApprovedOn: oItem.ApprovedOn,
              CreatedOnFrom: oItem.CreatedOnFrom,
              CreatedOnTo: oItem.CreatedOnTo,
            };

            // Updating (Individually with GroupId for Batch)
            oModel.update(sPath, oUpdateItem, {
              groupId: sBatchGroupId,
              success: function () {},
              error: function (oError) {
                sError = true; // Error processing data(Exception on RFC Call)
              },
            });
          } else {
            sError = true; // Error Biding Data
            MessageBox.error(`No binding context found for index: ${iIndex}`);
          }
        });

        try {
          await Promise.all(aPromises); // Ready?
          oModel.submitChanges({
            groupId: sBatchGroupId,
            success: function (oData) {
              if (!sError) {
                MessageBox.success("Freight Order(s) Approved");
              } else {
                MessageBox.error(
                  `Error updating Freight Order(s): ${
                    JSON.parse(oData.__batchResponses[0].response.body).error
                      .message.value
                  }`
                );
              }

              // Refresh to garantee after updates
              setTimeout(function () {
                that.onRefresh();
              }, 4000);
            },
            error: function (oError) {
              MessageBox.error(
                `Error updating Freight Order(s): ${
                  JSON.parse(oError.responseText).error.message.value
                }`
              );
            },
          });
        } catch (error) {
          MessageBox.error(`Error updating Freight Order(s): ${error.message}`);
        }
      },
      onNotApproved: async function (oEvent) {
        var that = this;
        var sError = false;
        var sBatchGroupId = "NotApproved";
        var sEntitySet = "/ActionsSet";
        var sPath = sEntitySet + "(NodeID=9)"; // Not Approved = 9
        var oSmartTable = this.byId("table001");
        var oTable = oSmartTable.getTable();
        var aSelectedIndices = oTable.getSelectedIndices();

        // Check if there are any selected indices
        if (aSelectedIndices.length === 0) {
          MessageBox.error("Select at least one line");
          return;
        }

        // Required create a new Model
        var oModel = new sap.ui.model.odata.v2.ODataModel(
          this.getOwnerComponent().getModel().sServiceUrl,
          true
        );

        oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
        oModel.setUseBatch(true);
        oModel.setDeferredGroups([sBatchGroupId]);

        var aPromises = aSelectedIndices.map(function (iIndex) {
          var oBindingContext = oTable.getContextByIndex(iIndex);
          if (oBindingContext) {
            var oItem = oBindingContext.getObject();
            var oUpdateItem = {
              NodeID: oItem.NodeID,
              HierarchyLevel: oItem.HierarchyLevel,
              ParentNodeID: oItem.ParentNodeID,
              DrillState: oItem.DrillState,
              TorId: oItem.TorId,
              Tspid: oItem.Tspid,
              ResId: oItem.ResId,
              Driver: oItem.Driver,
              GroWeiVal: oItem.GroWeiVal,
              EvtId: oItem.EvtId,
              EvtLocName: oItem.EvtLocName,
              EvtDescription: oItem.EvtDescription,
              EvtReason: oItem.EvtReason,
              //EvtReasonDesc: oItem.EvtReasonDesc,
              EvtStatus: oItem.EvtStatus,
              ApprovedBy: oItem.ApprovedBy,
              ApprovedOn: oItem.ApprovedOn,
              CreatedOnFrom: oItem.CreatedOnFrom,
              CreatedOnTo: oItem.CreatedOnTo,
            };

            // Updating (Individually with GroupId for Batch)
            oModel.update(sPath, oUpdateItem, {
              groupId: sBatchGroupId,
              success: function () {},
              error: function (oError) {
                sError = true; // Error processing data(Exception on RFC Call)
              },
            });
          } else {
            sError = true; // Error Biding Data
            MessageBox.error(`No binding context found for index: ${iIndex}`);
          }
        });

        try {
          await Promise.all(aPromises); // Ready?
          oModel.submitChanges({
            groupId: sBatchGroupId,
            success: function (oData) {
              if (!sError) {
                MessageBox.success("Freight Order(s) Not Approved");
              } else {
                MessageBox.error(
                  `Error updating Freight Order(s): ${
                    JSON.parse(oData.__batchResponses[0].response.body).error
                      .message.value
                  }`
                );
              }

              // Refresh to garantee after updates
              setTimeout(function () {
                that.onRefresh();
              }, 4000);
            },
            error: function (oError) {
              MessageBox.error(
                `Error updating Freight Order(s): ${
                  JSON.parse(oError.responseText).error.message.value
                }`
              );
            },
          });
        } catch (error) {
          MessageBox.error(`Error updating Freight Order(s): ${error.message}`);
        }
      },
      /* NewEvent - Fragment */
      openNewEventDialog: function (oEvent) {
        // Dialog to register a new event
        if (!this.pDialog) {
          Fragment.load({
            id: "NewEvent",
            name: "ZTM_EVENT_APPROVAL.view.NewEvent",
            type: "XML",
            controller: this,
          })
            .then((oDialog) => {
              // Defining globally fields for manipulation
              this.TorId = Fragment.byId("NewEvent", "TorId");
              this.PlannedDate = Fragment.byId("NewEvent", "PlannedDate");
              this.oFileUploader = Fragment.byId("NewEvent", "uploadSet");
              this.btnSave = Fragment.byId("NewEvent", "btnSave");

              // Set current date and time
              this.ActualDate = Fragment.byId("NewEvent", "ActualEventDate");
              this.ActualTime = Fragment.byId("NewEvent", "ActualEventTime");
              var oCurrentDate = new Date();
              this.ActualDate.setDateValue(oCurrentDate);
              this.ActualTime.setDateValue(oCurrentDate);

              // Store references to all MultiInput fields
              this.multiInputs = [
                Fragment.byId("NewEvent", "Event"),
                Fragment.byId("NewEvent", "EventReason"),
                Fragment.byId("NewEvent", "EventReasonCode"),
                Fragment.byId("NewEvent", "Location"),
                Fragment.byId("NewEvent", "Item"),
              ];

              //Set Multiinput values as token using fnValidator
              var fnValidator = function (args) {
                var text = args.text;
                return new sap.m.Token({ key: text, text: text });
              };

              if (this.multiInputs && this.multiInputs.length) {
                this.multiInputs.forEach(function (oInput) {
                  if (oInput) {
                    oInput.addValidator(fnValidator);
                  }
                });
              }

              this.TorId.addValidator(fnValidator);

              // Dialog control
              this.pDialog = oDialog;
              this.getView().addDependent(oDialog);
              this.pDialog.open();
            })
            .catch((error) => MessageBox.error(error.message));
        } else {
          this.pDialog.open();
        }
      },
      onCloseDialog: function (oEvent) {
        // Cancel button on Dialog
        this.pDialog.close();
        this._setEnabled(false);
        this.TorId.removeAllTokens();
      },
      onGetEvent: function (oEvent) {
        // Search for all data based on TorId
        var that = this;
        var oModel = new sap.ui.model.odata.v2.ODataModel(
          this.getOwnerComponent().getModel().sServiceUrl,
          true
        );

        var aTokens = this.TorId.getTokens();
        if (aTokens.length === 0) {
          MessageBox.error("Freight Order is required");
          return;
        }

        var TorId = aTokens[0].getKey();
        var aFilters = [
          new sap.ui.model.Filter(
            "TorId",
            sap.ui.model.FilterOperator.EQ,
            TorId
          ),
        ];

        oModel.read("/GetEventsSet", {
          filters: aFilters,
          success: function (oData) {
            if (oData.results.length > 0) {
              var eventData = oData.results[0];
              that._setEnabled(true);

              /*if (eventData.EvtCode && that.multiInputs[0]) {
                that.multiInputs[0].setTokens([
                  new sap.m.Token({
                    text:
                      eventData.EvtDescription + " (" + eventData.EvtCode + ")",
                    key: eventData.EvtCode,
                  }),
                ]);
              }*/

              if (eventData.EvtReason && that.multiInputs[1]) {
                that.multiInputs[1].setTokens([
                  new sap.m.Token({ text: eventData.EvtReason }),
                ]);
              }

              if (eventData.EvtReasonCode && that.multiInputs[2]) {
                that.multiInputs[2].setTokens([
                  new sap.m.Token({ text: eventData.EvtReasonCode }),
                ]);
              }

              if (eventData.PlannedDate && that.PlannedDate) {
                that.PlannedDate.setText(eventData.PlannedDate);
              }

              if (eventData.EvtLocName && that.multiInputs[3]) {
                that.multiInputs[3].setTokens([
                  new sap.m.Token({
                    text:
                      eventData.EvtLocName + " (" + eventData.EvtLocation + ")",
                    key: eventData.EvtLocation,
                  }),
                ]);
              }

              if (eventData.Itemid && that.multiInputs[4]) {
                that.multiInputs[4].setTokens([
                  new sap.m.Token({ text: eventData.Itemid }),
                ]);
              }
            } else {
              that._setEnabled(false);
              MessageBox.error("No data found, please check Freight Order");
            }
          },
          error: function () {
            that._setEnabled(false);
            MessageBox.error("No data found, please check Freight Order");
          },
        });
      },
      onVHTorId: function (oEvent) {
        var oSourceControl = oEvent.getSource();
        var oTorIdField = sap.ui.getCore().byId(oSourceControl.getId());

        this._oValueHelpTorId = this._createAndOpenValueHelpDialog(
          "Freight Order",
          "TorId",
          "TorId",
          [{ label: "Freight Order", template: "TorId" }],
          "/SHTorIdSet",
          oTorIdField,
          this._getModel()
        );
      },
      onVHEvent: function (oEvent) {
        var oSourceControl = oEvent.getSource();
        var oField = sap.ui.getCore().byId(oSourceControl.getId());
        var oTokens = this.TorId.getTokens();

        if (oTokens.length === 0) {
          sap.m.MessageToast.show("Freight Order is required");
          this._setEnabled(false);
          return;
        }

        this._oValueHelpEvent = this._createAndOpenValueHelpDialog(
          "Event Code",
          "EvtCode",
          "EvtDescription",
          [
            { label: "Event Code", template: "EvtCode" },
            { label: "Description", template: "EvtDescription" },
          ],
          "/SHEventSet",
          oField,
          this._getModel()
        );
      },
      onVHEventReasonCode: function (oEvent) {
        var oSourceControl = oEvent.getSource();
        var oField = sap.ui.getCore().byId(oSourceControl.getId());

        this._oValueHelpEventReasonCode = this._createAndOpenValueHelpDialog(
          "Event Reason Code",
          "EvtReasonCode",
          "EvtReasonCode",
          [
            { label: "Event Reason Code", template: "EvtReasonCode" },
            { label: "Description", template: "Description" },
          ],
          "/SHEventReasonCodeSet",
          oField,
          this._getModel()
        );
      },
      onVHLocation: function (oEvent) {
        var oSourceControl = oEvent.getSource();
        var oField = sap.ui.getCore().byId(oSourceControl.getId());
        var oTokens = this.TorId.getTokens();

        if (oTokens.length === 0) {
          sap.m.MessageToast.show("Freight Order is required");
          this._setEnabled(false);
          return;
        }

        this._oValueHelpLocation = this._createAndOpenValueHelpDialog(
          "Location",
          "EvtLocation",
          "EvtLocName",
          [
            { label: "Location", template: "EvtLocation" },
            { label: "Description", template: "EvtLocName" },
          ],
          "/SHLocationSet",
          oField,
          this._getModel()
        );
      },
      onVHItem: function (oEvent) {
        var oSourceControl = oEvent.getSource();
        var oField = sap.ui.getCore().byId(oSourceControl.getId());
        var oTokens = this.TorId.getTokens();

        if (oTokens.length === 0) {
          sap.m.MessageToast.show("Freight Order is required");
          this._setEnabled(false);
          return;
        }

        this._oValueHelpItem = this._createAndOpenValueHelpDialog(
          "Items",
          "Itemid",
          "Itemid",
          [{ label: "Item", template: "Itemid" }],
          "/SHItemSet",
          oField,
          this._getModel()
        );
      },
      _createAndOpenValueHelpDialog: function (
        // This function builds the ValueHelp for all MultiInputs
        title,
        key,
        descriptionKey,
        columns,
        bindingPath,
        oField,
        oModel
      ) {
        var that = this;
        var oValueHelp = new sap.ui.comp.valuehelpdialog.ValueHelpDialog("", {
          title: title,
          //supportMultiselect: key === "Itemid", // Special condition for Items
          supportRanges: true,
          key: key,
          descriptionKey: descriptionKey,
          stretch: sap.ui.Device.system.phone,
          ok: function (oEvent) {
            var aTokens = oEvent.getParameter("tokens");
            oField.setTokens(aTokens);
            this.close();
          },
          cancel: function () {
            this.close();
          },
        });

        var oColModel = new sap.ui.model.json.JSONModel();
        oColModel.setData({ cols: columns });
        var oTable = oValueHelp.getTable();
        oTable.setModel(oColModel, "columns");
        oTable.setModel(oModel);
        oTable.bindRows(bindingPath);

        if (key === "EvtReasonCode") {
          if (that._getEventId()) {
            // Just consider filter if have EventId
            oTable
              .getBinding("rows")
              .filter(
                new sap.ui.model.Filter(
                  "EvtCode",
                  sap.ui.model.FilterOperator.EQ,
                  that._getEventId()
                )
              );
          }
        } else {
          if (that._getTorId()) {
            // Just consider filter if have TorId
            oTable
              .getBinding("rows")
              .filter(
                new sap.ui.model.Filter(
                  "TorId",
                  sap.ui.model.FilterOperator.EQ,
                  that._getTorId()
                )
              );
          }
        }

        oValueHelp.setRangeKeyFields([{ label: key, key: key }]);
        oValueHelp.open();
        return oValueHelp;
      },
      _getTorId: function () {
        var oTokens = this.TorId.getTokens();
        return oTokens.length > 0 ? oTokens[0].getKey() : null;
      },
      _getEventId: function () {
        var oTokens = this.multiInputs[0].getTokens();
        return oTokens.length > 0 ? oTokens[0].getKey() : null;
      },
      _getModel: function () {
        return new sap.ui.model.odata.v2.ODataModel(
          this.getOwnerComponent().getModel().sServiceUrl,
          true
        );
      },
      _setEnabled: function (oStatus) {
        // Control the Enable/Disable for all fields and buttons
        var that = this;

        //Activate / Deactivate
        if (that.multiInputs && that.multiInputs.length) {
          that.multiInputs.forEach(function (oInput) {
            if (oInput) {
              oInput.setEnabled(oStatus);
            }
          });
        }

        if (that.ActualDate) {
          that.ActualDate.setEnabled(oStatus);
          if (!oStatus) {
            that.ActualDate.setValue("");
          }
        }

        if (that.ActualTime) {
          that.ActualTime.setEnabled(oStatus);
          if (!oStatus) {
            that.ActualTime.setValue("");
          }
        }

        if (that.oFileUploader) {
          that.oFileUploader.setEnabled(oStatus);
          if (!oStatus) {
            that.oFileUploader.clear();
          }
        }

        if (that.btnSave) {
          that.btnSave.setEnabled(oStatus);
        }

        // oStatus = false? Clear fields
        if (that.multiInputs && that.multiInputs.length) {
          that.multiInputs.forEach(function (oInput) {
            if (oInput instanceof sap.m.MultiInput) {
              oInput.setEnabled(oStatus);
              if (!oStatus) {
                oInput.removeAllTokens();
                var oCurrentDate = new Date();
                that.ActualDate.setDateValue(oCurrentDate);
                that.ActualTime.setDateValue(oCurrentDate);
              }
            }
          });
        }
      },
      _convertDate: function (dateStr) {
        var dateParts = dateStr.includes("/")
          ? dateStr.split("/")
          : dateStr.split(".");
        var month = dateParts[0].padStart(2, "0");
        var day = dateParts[1].padStart(2, "0");
        var year =
          dateParts[2].length === 2 ? "20" + dateParts[2] : dateParts[2];
        return year + month + day;
      },
      _convertTime: function (timeStr) {
        var timeParts = timeStr.split(/[: ]/);
        var hours = parseInt(timeParts[0], 10);
        var minutes = timeParts[1];
        var seconds = timeParts[2];
        var period = timeParts[3];

        if (period === "PM" && hours < 12) {
          hours += 12;
        }
        if (period === "AM" && hours === 12) {
          hours = 0;
        }

        return String(hours).padStart(2, "0") + minutes + seconds;
      },
      _handleChangeFileUploader: function (oEvent) {
        // Required to define Attachment Name and values as Global on Dialog
        sap.ui.getCore()._file =
          oEvent.getParameter("files") && oEvent.getParameter("files")[0];
      },
      _attachmentRead: function (oEvent) {
        // Reading Attachment
        var file = sap.ui.getCore()._file;
        if (file && window.FileReader) {
          var reader = new FileReader();
          return new Promise(function (resolve, reject) {
            reader.onload = function (evn) {
              var attachment = evn.target.result;
              resolve(attachment);
            };
            reader.onerror = function (error) {
              reject(error);
            };
            reader.readAsDataURL(file);
          });
        } else {
          return Promise.resolve("");
        }
      },
      _getTokenValue: function (token) {
        // Get token value
        return token ? token.getKey() || token.getText() : "";
      },
      _readFileAsBase64: function (file) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () {
            var binaryString = reader.result;
            var base64String = btoa(binaryString);
            resolve(base64String);
          };
          reader.onerror = function (error) {
            reject(error);
          };
          reader.readAsBinaryString(file);
        });
      },
      onCreateEvent: async function (oEvent) {
        // Creating a New Event from Dialog
        var that = this;
        var sEntitySet = "/CreateSet";

        // Required create a new Model
        var oModel = new sap.ui.model.odata.v2.ODataModel(
          this.getOwnerComponent().getModel().sServiceUrl,
          true
        );

        // Required fields informed?
        var torIdToken = this._getTokenValue(this.TorId.getTokens()[0]);
        var evtCodeToken = this._getTokenValue(
          this.multiInputs[0].getTokens()[0]
        );
        var itemidTokens = this.multiInputs[4].getTokens(); // Get all tokens from multiInputs[4]

        if (!torIdToken || !evtCodeToken || itemidTokens.length === 0) {
          MessageBox.error("Fill required fields");
          return; // Ops!
        }

        var attachment = "";
        var attachmentName = "";
        try {
          var file = sap.ui.getCore()._file;
          if (file) {
            attachmentName = file.name;

            // Read file as ArrayBuffer and encode to Base64
            attachment = await this._readFileAsBase64(file);
          }
        } catch (error) {
          console.error("Error reading attachment:", error);
          MessageBox.error("Error reading attachment");
          return;
        }

        // Promisify update operation
        function updateItem(oModel, sPath, oUpdateItem) {
          return new Promise(function (resolve, reject) {
            oModel.update(sPath, oUpdateItem, {
              success: function () {
                resolve();
              },
              error: function (oError) {
                reject(oError);
              },
            });
          });
        }

        // Promisify submitChanges operation
        function submitChanges(oModel) {
          return new Promise(function (resolve, reject) {
            oModel.submitChanges({
              success: function (oData) {
                resolve(oData);
              },
              error: function (oError) {
                reject(oError);
              },
            });
          });
        }

        // Array to store promises for each item update
        var promises = [];

        // Loop through itemidTokens and create promises for each item
        for (var i = 0; i < itemidTokens.length; i++) {
          var token = itemidTokens[i];

          var oUpdateItem = {
            TorId: torIdToken,
            EvtCode: evtCodeToken,
            EvtReason: this._getTokenValue(that.multiInputs[1].getTokens()[0]),
            EvtReasonCode: this._getTokenValue(
              that.multiInputs[2].getTokens()[0]
            ),
            ActualDate: that.ActualDate.getValue()
              ? that._convertDate(that.ActualDate.getValue())
              : "",
            ActualTime: that.ActualTime.getValue()
              ? that._convertTime(that.ActualTime.getValue())
              : "",
            EvtLocName: this._getTokenValue(that.multiInputs[3].getTokens()[0]),
            Itemid: this._getTokenValue(token),
            AttachmentName: attachmentName,
            Attachment: attachment,
          };

          var sPath = sEntitySet + "(TorId='" + torIdToken + "')";

          // Create promise for update and push to promises array
          var updatePromise = updateItem(oModel, sPath, oUpdateItem)
            .then(function () {
              return submitChanges(oModel);
            })
            .then(function (oData) {
              MessageBox.success("Freight Order(s) Event Created");
              that.onCloseDialog();
            })
            .catch(function (error) {
              MessageBox.error(
                `Error updating Freight Order(s): ${
                  JSON.parse(error.responseText).error.message.value
                }`
              );
            });

          promises.push(updatePromise);
        }

        // Execute all promises
        Promise.all(promises)
          .then(function () {
            // All updates completed successfully
            setTimeout(function () {
              that.onRefresh();
            }, 4000);
          })
          .catch(function (error) {
            // Handle any errors in updating or submitting changes
            MessageBox.error(
              `Error updating Freight Order(s): ${error.message}`
            );
          });
      },
    });
  }
);
