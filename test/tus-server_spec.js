const helper = require("node-red-node-test-helper");
const tusNode = require("../src/tus-server.js");

helper.init(require.resolve('node-red'), {
    functionGlobalContext: { os:require('os') }
});

describe('tus-server Node', function () {

    before(function (done) {
        helper.startServer(done);
    });

    afterEach(function(done) {
        helper.unload().then(function() {
            helper.stopServer(done);
        });
    });

    it('should be loaded', function (done) {
        const flow = [
            {
                id: "n1",
                type: "tus-server",
                path: "/files",
                port: 1081,
                store: "/tmp"
            }];
        helper.load(tusNode, flow, function () {
            const n1 = helper.getNode("n1");
            try {
                //Storage dir is set to /tmp
                n1.should.have.property('storageDir', '/tmp');
                //server is set to a http server
                n1.should.have.property('server');
                //Server should be a http.Server
                n1.server.should.be.an.instanceOf(require('http').Server);
                done();
            } catch (err) {
                done(err);
            }
        });
    });
});

