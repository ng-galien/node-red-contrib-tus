const {Server} = require('@tus/server')
const {FileStore} = require('@tus/file-store')
const {EVENTS} = require('@tus/server')
const express = require('express');
/**
 * Register event listeners for the given event and send a message to the first output.
 * The message contains the event name as topic and the data as payload.
 *
 * @param event the event to listen to, POST_CREATE, POST_RECEIVE, POST_FINISH, POST_TERMINATE
 * @param node the node
 * @param tus the tus server
 */
function registerEventListeners(event, node, tus) {
    node.debug('Registering event listener for ' + event);
    tus.on(event, (req, res, upload) => {
        node.debug('Event: ' + event);
        const message = {
            topic: event,
            payload: upload
        };
        node.send([message, null]);
    });
}

function computeStorageDir(RED, config) {
    const path = require('path');
    //If the path is absolute, use it as is
    if (path.isAbsolute(config.store)) {
        return config.store;
    }
    let userDir = RED.settings.userDir || process.env.NODE_RED_HOME;
    if (!userDir) {
        userDir = path.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH, '.node-red');
    }
    return path.join(userDir, config.store);
}

/**
 * Handle the command from the input message and return the payload.
 * The command is given in msg.topic
 * If the command is equal to 'list', the result is an array of all uploads.
 * If the command is equal to 'clear', it clears all uploads.
 *
 * @param node
 * @param msg
 * @returns {undefined}
 */
function handleCommand(node, msg) {
    const storageDir = node.storageDir;
    if(!storageDir) {
        return 'storageDir not set';
    }
    const command = msg.topic;
    if (command === 'list') {
        //List all uploads in storageDir
        //Get all json files in storageDir, load them and return the result as an array
        const fs = require('fs');
        const path = require('path');
        const uploads = [];
        fs.readdirSync(storageDir).forEach(file => {
            if(file.endsWith('.json')) {
                //Load the file
                const jsonFile = path.join(storageDir, file);
                const upload = fs.readFileSync(jsonFile).toString();
                uploads.push(JSON.parse(upload));
            }
        });
        return uploads;
    } else if (command === 'clear') {
        //Delete all uploads in storageDir
        const fs = require('fs');
        const path = require('path');
        fs.readdirSync(storageDir).forEach(file => {
            //Delete the file
            const targetFile = path.join(storageDir, file);
            fs.unlinkSync(targetFile);
        });
        return 'cleared';
    } else {
        return 'unknown command';
    }
}

module.exports = function(RED) {
    function TusServer(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.path = config.path;
        if(!node.path.startsWith('/')) {
            node.path = '/' + node.path;
        }
        node.port = config.port;
        node.on('close', function (removed, done) {
            let node = this;
            if(node.server) {
                node.debug('Closing server');
                node.server.close(() => {
                    node.debug('Server closed');
                    node.status({fill: "red", shape: "dot", text: "disconnected"});
                    done();
                });
            } else {
                node.debug('Server not started');
                done();
            }
        });
        node.on('input', function(msg, send, done) {
            send = send || function() { node.send.apply(node,arguments) }
            msg.payload = handleCommand(node, msg);
            send([null, msg]);
            if (done) {
                done();
            }
        });
        node.storageDir = computeStorageDir(RED, config);
        node.debug('storageDir: ' + node.storageDir);
        const tusServer = new Server({
            path: node.path,
            datastore: new FileStore({directory: config.store}),
        });
        [EVENTS.POST_CREATE, EVENTS.POST_RECEIVE, EVENTS.POST_FINISH, EVENTS.POST_TERMINATE]
            .forEach(event => registerEventListeners(event, node, tusServer));
        const app = express();
        const uploadApp = express();
        uploadApp.all('*', tusServer.handle.bind(tusServer));
        app.use(node.path, uploadApp);
        node.server = app.listen(config.port, function (err) {
            if (err) {
                node.error('Error starting server: ' + err);
                node.status({fill: "red", shape: "dot", text: "Error starting server"});
            } else {
                node.debug('Server started on port ' + config.port);
                node.status({fill: "green", shape: "dot", text: "connected"});
            }
        });
    }
    RED.nodes.registerType("tus-server", TusServer);
}