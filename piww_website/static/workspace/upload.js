$ = function(id) { return document.getElementById(id); };

// only allow one file to be compressed/uploaded at a time
var g_uploading = false;

// not a real event
function compressionUpdate(evt) {
    $('drop_zone').innerHTML = Math.ceil(50 * (evt.loaded / evt.total)) + "%";
    if (evt.loaded == evt.total) {
        $('debug').innerHTML += "seconds to compress: " + (((new Date()).getTime() - g_compressStart)/1000) + "<br>";
    }
}

function processing(dots) {
    da = ["", ".", "..", "...", "..", "."];
    dots = dots % 6;
    var i;
    $('drop_zone').innerHTML = da[dots] + "processing" + da[dots];
    setTimeout("processing(" + (dots + 1) + ")",1000);
}

function uploadUpdate(evt) {
    if (this.readyState == 4) {
        if (this.status == 200) {
            processing(0);
        window.location.href = '/download/' + this.responseText + '/package.zip';
        }
    }

    if (evt.total == evt.loaded) {
        $('drop_zone').innerHTML = "100%";
        //      g_uploading = false;
    } else {
      $('drop_zone').innerHTML = 50 + Math.ceil(50 * (evt.loaded / evt.total)) + "%";
    }
}

// asynchronously compress and then upload data
// each compressed data chunk will be in its own mime part
// callbacks will trigger on for each chunk that is processed with
//   evt.loaded = bytes processed
//   evt.total = total bytes to be processed
// data is compressed with zlib deflate, then base64 encoded
function uploadCompressedData(data, filename, compressionCallback, uploadCallback) {
    // modified from https://developer.mozilla.org/en/using_files_from_web_applications
    function uploadDataAsync() {
        var dataSize = 0;
        var boundary = "yyyyyyyyyyyyyyyyyyyy";
        var uri = "/upload";
        var xhr = new XMLHttpRequest();

        // build up a fake Mime message, lots of parts to make sure server side can handle it
        // server should only care about the Filedata part
        var body = "--" + boundary + "\r\n";

        var i;

        for(i in c_compressedData) {
        var chunk = btoa(c_compressedData[i]);
            dataSize += chunk.length;

            body += "--" + boundary + "\r\n";
            body += "Content-Disposition: form-data; name=\"Filedata\"; filename=\"" + filename + "\"\r\n";
            body += "Content-Type: application/octet-stream\r\n\r\n";
            body += chunk + "\r\n";
        }

        body += "--" + boundary + "--";

        xhr.open("POST", uri, true);
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary="+boundary);

        xhr.upload.addEventListener("progress", uploadCallback, false);
        xhr.upload.addEventListener("load", uploadCallback, false);
        //      xhr.upload.addEventListener("readystatechange", uploadCallback, false);
        xhr.onreadystatechange = uploadCallback;

        $('debug').innerHTML += "compressed chunks: " + c_compressedData.length + "<br>";
        $('debug').innerHTML += "compressed size: " + body.length + "<br>";

      xhr.send(body);
    }

    function int32ToBytes(int) {
        bytes = [];
        bytes[3] = String.fromCharCode(int & 255);
        int = int >> 8;
        bytes[2] = String.fromCharCode(int & 255);
        int = int >> 8;
        bytes[1] = String.fromCharCode(int & 255);
        int = int >> 8;
        bytes[0] = String.fromCharCode(int & 255);
        return bytes.join("");
    }

    // adler32 is amazingly simple
    function adler32(data) {
        var a = 1;
        var b = 0;
        var i;
        for(i=0;i<data.length;i++) {
            var ascii = data.charCodeAt(i);
            a = (a + ascii) % 65521;
            b = (a + b) % 65521;
        }

      return int32ToBytes(b*65536 + a);
    }

    function compressDataChunkFastlz(chunk) {
        // compress with fastlz
        // need to compare how different chunk sizes work
        var size = int32ToBytes(chunk.length);
        var checksum = adler32(chunk);
        var compressed = FastLz.compressor(chunk);
        return size + checksum + compressed;
    }

    compressDataChunk = compressDataChunkFastlz;

    function compressDataAsync() {
        // compress a data chunk
        c_compressedData.push(compressDataChunk(c_data.slice(c_evt.loaded, c_evt.loaded + c_chunkSize)));
        c_evt.loaded += c_chunkSize;
        if (c_evt.loaded > c_evt.total) {
            c_evt.loaded = c_evt.total;
        }
        compressionCallback(c_evt);
        if (c_evt.loaded < c_evt.total) {
            setTimeout(compressDataAsync, 0);
        } else {
            // compression is done, lets trigger upload
        c_evt.loaded = 0;
            c_evt.total = c_compressedData.length;
            setTimeout(uploadDataAsync, 0);
        }
    }

    var c_compressedData = [];
    c_data = data; // are we duplicating data?
    var c_evt = [];
    c_evt.loaded = 0;
    c_evt.total = c_data.length;
    c_chunkSize = 1048576;

    g_compressStart = (new Date()).getTime();

    setTimeout(compressDataAsync, 0);
}

function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    if (g_uploading === true) {
        return;
    }
    g_uploading = true;

    var f = evt.dataTransfer.files[0]; // Grab just the first file as a File object
    var reader = new FileReader();

    reader.onload = function(e) {
        uploadCompressedData(e.target.result, f.name, compressionUpdate, uploadUpdate);
    };

    reader.readAsText(f);
  }

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
}
