function handleDrop(event) {
    event.stopPropagation();
    event.preventDefault();

    // if we drag over the image, we get a child node
    var id = event.target.id || (event.target.parentNode && event.target.parentNode.id)

    $("#debug").append("upload: " + event.originalEvent.dataTransfer.files[0].name + "(" + id + ")" + "<b>");
}

function handleLockClick(event) {
    // default state of unlocked
    if (typeof event.target.state === 'undefined') {
        event.target.state = 0;
    }
    // toggle locked state
    event.target.state = 1 - event.target.state;
    if (event.target.state == 0) {
        event.target.src = "/static/workspace/unlocked.png";
    } else {
        event.target.src = "/static/workspace/locked.png";
    }
}
