const tus = require("tus-js-client");
const fs = require("fs");
const path = require("path");

function uploadFile(url, fileName, callback) {
    try {
        if (!tus.isSupported) {
            callback(new Error("Tus is not supported"));
        }
        const filePath = path.join(__dirname, "sample.txt");
        const file = fs.readFileSync(filePath);

        const upload = new tus.Upload(file, {
            endpoint: url,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            metadata: {
                filename: path.basename(filePath),
                filetype: "text/plain"
            },
            onSuccess: function () {
                if (callback) {
                    callback(null, upload.url);
                }
            },
            onError: function (error) {
                if (callback) {
                    callback(error);
                }
            },
        });

        upload.start();
    }
    catch (err) {
        callback(err);
    }
}
module.exports = uploadFile;