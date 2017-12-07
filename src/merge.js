export default function merge(diff) {

    // Just take the most recent message for the time being
    // Advanced merge must be developed

    const merged = [];


    let maxT = 0;
    let selectedPacked;

    diff.forEach(([packet, clients]) => {
        let t = packet && packet.receivedTimestamp || 0;
        if (t > maxT) {
            selectedPacked = packet;
            maxT = t;
        }
    });

    return selectedPacked;
}