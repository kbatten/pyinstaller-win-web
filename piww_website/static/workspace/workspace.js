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
