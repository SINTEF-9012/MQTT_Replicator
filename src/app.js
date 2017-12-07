import starter from './starter.js';
import Concierge from './concierge.js';

let clients = starter();
let concierge = new Concierge(clients);

function broadcast(packet, retain = false, clientToIgnore = null) {
    clients.forEach((client) => {
        if (client !== clientToIgnore) {
            client.publish(packet, retain);
        }
    });
}

clients.forEach((client) => {
    client.connect();
    client.subscribe("#", 2);
    /*client.events.on('message', (packet) => {
        console.log(`Broadcasting from ${client.name}: ${packet.topic}/${packet.payload}`);
        broadcast(packet, client);
    });*/
});

concierge.events.on('merge', (merge) => {
    console.log(`Broadcasting: ${merge.topic}/${merge.payload}`);
    broadcast(merge);
})