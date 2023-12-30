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

    it('should be loaded', async function () {
        const flow = [
            {
                id: "n1",
                type: "tus-server",
                path: "/files",
                port: 1081,
                store: "/tmp"
            }];
        await helper.load(tusNode, flow)
        const n1 = helper.getNode("n1");
        try {
            //Node should be loaded
            n1.should.not.be.null;
            //Storage dir is set to /tmp
            n1.should.have.property('storageDir', '/tmp');
            //server is set to a http server
            n1.should.have.property('server');
            const server = n1.server;
            //Server should be a http.Server
            server.should.be.an.instanceOf(require('http').Server);
            return Promise.resolve();
        } catch (err) {
            return Promise.reject(err);
        }
    });

    it('should be able to upload a file', async function () {
        const flow = [
            {id: "n2", type: "helper"},
            {id: "n1", type: "tus-server", path: "/files", port: 1081, store: "/tmp", wires: [["n2"], []]}
        ];
        await helper.load(tusNode, flow);

        const file = "sample.txt";
        const url = "http://localhost:1081/files";
        const n2 = helper.getNode("n2");
        n2.on("input", function (msg) {
            try {
                msg.should.have.property('topic');
                msg.should.have.property('payload');
                msg.payload.should.have.property('id');
                msg.payload.should.have.property('metadata');
                return Promise.resolve();
            } catch(err) {
                return Promise.reject(err);
            }
        });
        const res = await uploadFile(url, file);
        if(res instanceof Error) {
            return Promise.reject(res);
        }
        return Promise.resolve();
    });
});