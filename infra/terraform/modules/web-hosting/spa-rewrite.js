function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Redirect the bare app prefixes so relative asset URLs resolve under the prefix.
  if (uri === '/elder' || uri === '/volunteer') {
    var parts = [];
    for (var key in request.querystring) {
      var entry = request.querystring[key];
      if (entry.multiValue) {
        for (var i = 0; i < entry.multiValue.length; i++) {
          parts.push(key + '=' + entry.multiValue[i].value);
        }
      } else {
        parts.push(key + '=' + entry.value);
      }
    }
    var query = parts.length > 0 ? '?' + parts.join('&') : '';
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: uri + '/' + query } },
    };
  }

  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);

  // Extensionless paths are client-side routes; serve the shell of the app that owns the prefix.
  if (lastSegment.indexOf('.') === -1) {
    if (uri.indexOf('/elder/') === 0) {
      request.uri = '/elder/index.html';
    } else if (uri.indexOf('/volunteer/') === 0) {
      request.uri = '/volunteer/index.html';
    } else {
      request.uri = '/index.html';
    }
  }

  return request;
}
