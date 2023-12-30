const helper = require("node-red-node-test-helper");
const tusNode = require("../src/tus-server.js");
const uploadFile = require("./tus-uploader.js");

helper.init(require.resolve('node-red'), {
    functionGlobalContext: { os:require('os') }
});

describe('tus-server Node', function () {

    before(function (done) {
        helper.startServer(done);
    });

    afterEach(function(done) {
        helper.unload().then(function() {
            done();
        });
    });

    after(function(done) {
        helper.stopServer(done);
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
    it('should be able to upload a file', function (done) {
        const flow = [
            {id: "n2", type: "helper"},
            {id: "n1", type: "tus-server", path: "/files", port: 1081, store: "/tmp", wires: [["n2"], []]}
        ];
        helper.load(tusNode, flow, function () {

            const file = "test/sample.txt";
            var url = "http://localhost:1081/files";
            const n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('topic');
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('id');
                    msg.payload.should.have.property('metadata');
                    done();
                } catch(err) {
                    done(err);
                }
            });
            uploadFile(url, file, function (err, res) {
                if (err) {
                    done(err);
                } else {
                    try {
                        res.should.be.not.null;
                    } catch (err) {
                        done(err);
                    }
                }
            });
        });
    });
});

