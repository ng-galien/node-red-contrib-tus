const tus = require("tus-js-client");
const fs = require("fs").promises;  // Use the promise-based version of fs
const path = require("path");

async function uploadFile(url, fileName) {
    if (!tus.isSupported) {
        throw new Error("Tus is not supported");
    }

    const filePath = path.join(__dirname, fileName); // Use fileName from arguments
    const file = await fs.readFile(filePath); // Read file asynchronously

    return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
            endpoint: url,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            metadata: {
                filename: path.basename(filePath),
                filetype: "text/plain"
            },
            onSuccess: function () {
                resolve(upload.url); // Resolve the promise with the URL
            },
            onError: function (error) {
                reject(error); // Reject the promise with the error
            },
        });

        upload.start();
    });
}

module.exports = uploadFile;
