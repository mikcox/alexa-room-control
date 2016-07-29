/**
 * This code is based on a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for the sample, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

// Connect to AWS IoT
var awsIot = require('aws-iot-device-sdk');
var request = require('request');
var device = awsIot.device({
    "host": "a1hpdzughvb7b0.iot.us-west-2.amazonaws.com",
      "port": 8883,
      "clientId": "my-room-alexa",
      "thingName": "My_Room",
      "caCert": "certificates/root-CA.crt",
      "clientCert": "certificates/0a5ea7d8f3-certificate.pem.crt",
      "privateKey": "certificates/0a5ea7d8f3-private.pem.key"
});

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        device
          .on('connect', function() {
            console.log('Connected to AWS IoT.');
          });

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.[unique-value-here]") {
             context.fail("Invalid Application ID");
        }
        */

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("ChangeLightIntent" === intentName) {
        changeColors(intent, session, callback);
    } else if ("ChangeBrightnessIntent" === intentName) {
        changeBrightness(intent, session, callback);
    } else if ("BlinkIntent" === intentName) {
        blinkLights(intent, session, callback);
    } else if ("TurnOnTVAndSoundbarIntent" === intentName) {
        turnOnTVAndSoundbar(intent, session, callback);
    } else if ("TurnOffTVAndSoundbarIntent" === intentName) {
        turnOffTVAndSoundbar(intent, session, callback);
    } else if ("TurnOnACIntent" === intentName) {
        turnOnAC(intent, session, callback);
    } else if ("TurnOffACIntent" === intentName) {
        turnOffAC(intent, session, callback);
    } else if ("ChangeACModeIntent" === intentName) {
        changeACmode(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to the I E C light control voice interface. " +
        "You can now issue commands like, change color to blue.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Please issue a command such as, change color to blue.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * Changes the color / brightness / effect of the lights and prepares the speech to reply to the user.
 */
function changeColors(intent, session, callback) {
    var cardTitle = intent.name;
    var commandSlot = intent.slots.Command;
    var colorSlot = intent.slots.Color;
    var simulationSlot = intent.slots.Simulation;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    if (commandSlot) {
        var command = commandSlot.value;
        if ( (command === 'change color' || command === 'turn lights') && colorSlot) {
            var color = colorSlot.value;
            sessionAttributes = createSessionAttributes(command, color);
            //speechOutput = "Changed color to " + color + ".";
            repromptText = "You can issue commands like," + "Alexa, tell my room to change color to blue.";

            // Create light states that our Philips Hue lights will understand
            var saturation = 100;
            var lightColor;
            switch( color ) {
                case 'red':
                    lightColor = 0;
                    break;
                case 'orange':
                    lightColor = 30;
                    break;
                case 'yellow':
                    lightColor = 60;
                    break;
                case 'green':
                    lightColor = 120;
                    break;
                case 'teal':
                    lightColor = 180;
                    break;
                case 'blue':
                    lightColor = 240;
                    break;
                case 'purple':
                    lightColor = 285;
                    break;
                case 'pink':
                    lightColor = 300;
                    break;
                default:
                    lightColor = 0;
                    saturation = 0;
            }

            var desiredState = {
                "lights": {
                    "on": true,
                    "bri": 100,
                    "hue": lightColor,
                    "sat": saturation
                }
            };

            // Publish states as messages to AWS IoT topic
            device.publish('$aws/things/My_Room/shadow/update',
            JSON.stringify({ "state": {
              "desired": desiredState
            }}), null, function() {
                callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
            });

            console.log( 'Set state of all lights to ' + JSON.stringify({ "state": {
              "desired": desiredState
            }}) );
        } else if ( command === 'turn lights on' || command === 'turn on lights' ) {
            // Turn lights on to default of white light
            var desiredState = {
                "lights": {
                    "on": true,
                    "bri": 100,
                    "hue": 0,
                    "sat": 0
                }
            };

            // Publish states as messages to AWS IoT topic
            device.publish('$aws/things/My_Room/shadow/update',
            JSON.stringify({ "state": {
              "desired": desiredState
            }}), null, function() {
                callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
            });
        } else if ( command === 'turn lights off' || command === 'turn off lights' ) {
            var desiredState = {
                "lights": {
                    "on": false
                }
            };

            // Publish states as messages to AWS IoT topic
            device.publish('$aws/things/My_Room/shadow/update',
            JSON.stringify({ "state": {
              "desired": desiredState
            }}), null, function() {
                callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
            });
        } else {
            speechOutput = "The command you issued was " + command + ".";
            repromptText = "You can issue commands like," + "Alexa, tell my room to change color to blue.";
        }
        
    } else {
        speechOutput = "I'm not sure what command you tried to issue. Please try again.";
        repromptText = "I'm not sure what command you tried to issue.  You can issue commands like," +
            "Alexa, tell my room to change color to blue.";
        shouldEndSession = false;
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
    }
}

function changeBrightness(intent, session, callback) {
    var cardTitle = intent.name;
    var brightnessSlot = intent.slots.Brightness;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    if ( brightnessSlot ) {
        var brightnessVal = Math.min( brightnessSlot.value, 100 );
        // Change the brightness value of the lights, weighted by the percentage given to Alexa
        var desiredState = {
            "lights": {
                "bri": Math.round( brightnessVal )
            }
        };

        // Publish states as messages to AWS IoT topic
        device.publish('$aws/things/My_Room/shadow/update',
        JSON.stringify({ "state": {
          "desired": desiredState
        }}), null, function() {
            speechOutput = "Changed brightness to " + brightnessVal + " percent.";
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
        });
        
    } else {
        speechOutput = "I'm not sure what command you tried to issue. Please try again.";
        repromptText = "I'm not sure what command you tried to issue.  You can issue commands like," +
            "Alexa, tell light control to change color to blue.";
        shouldEndSession = false;
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
    }
}

function turnOnTVAndSoundbar(intent, session, callback) {
    var cardTitle = intent.name;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    // Turn on the TV and the soundbar
    var desiredState = {
        soundbar: {
            on: true
        },
        tv: {
            on: true
        }
    };

    // Publish states as messages to AWS IoT topic
    device.publish('$aws/things/My_Room/shadow/update',
    JSON.stringify({ "state": {
      "desired": desiredState
    }}), null, function() {
        speechOutput = "Turned on TV and soundbar.";
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
    });  
}

function turnOffTVAndSoundbar(intent, session, callback) {
    var cardTitle = intent.name;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    // Turn off the TV and the soundbar
    var desiredState = {
        soundbar: {
            on: false
        },
        tv: {
            on: false
        }
    };

    // Publish states as messages to AWS IoT topic
    device.publish('$aws/things/My_Room/shadow/update',
    JSON.stringify({ "state": {
      "desired": desiredState
    }}), null, function() {
        speechOutput = "Turned off TV and soundbar.";
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
    });  
}

function turnOnAC(intent, session, callback) {
    var cardTitle = intent.name;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    // Turn on the AC
    var desiredState = {
        ac: {
            on: true
        }
    };

    // Publish states as messages to AWS IoT topic
    device.publish('$aws/things/My_Room/shadow/update',
    JSON.stringify({ "state": {
      "desired": desiredState
    }}), null, function() {
        speechOutput = "Cool.";
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
    });  
}

function turnOffAC(intent, session, callback) {
    var cardTitle = intent.name;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    // Turn on the AC
    var desiredState = {
        ac: {
            on: false,
            mode: 'energy_saver'
        }
    };

    // Publish states as messages to AWS IoT topic
    device.publish('$aws/things/My_Room/shadow/update',
    JSON.stringify({ "state": {
      "desired": desiredState
    }}), null, function() {
        speechOutput = "Not cool.";
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
    });  
}

function changeACmode(intent, session, callback) {
    var cardTitle = intent.name;
    var repromptText = "";
    var sessionAttributes = {};
    var modeSlot = intent.slots.Mode;
    var shouldEndSession = true;
    var speechOutput = ""

    if ( modeSlot ) {
        var mode = modeSlot.value;

        // Format as we expect on the back end
        if ( mode === 'energy saver' ) {
            mode = 'energy_saver';
        }

        // Turn on the AC
        var desiredState = {
            ac: {
                mode: mode
            }
        };

        // Publish states as messages to AWS IoT topic
        device.publish('$aws/things/My_Room/shadow/update',
        JSON.stringify({ "state": {
          "desired": desiredState
        }}), null, function() {
            speechOutput = "";
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession))
        });
    }
}

function createSessionAttributes(command, color) {
    return {
        command: command,
        color: color
    };
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}