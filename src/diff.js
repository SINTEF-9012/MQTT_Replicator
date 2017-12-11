import Packet from './packet.js';

export default function diff(clients, topic) {
    const data = clients.map((client) => [client.getPacketFromTopic(topic), client]);

    const messages = [];
    data.forEach(d => {
        let foundMessage = false;
        for (let i = 0, l = messages.length; i < l; ++i) {
            if (Packet.equals(messages[i][0], d[0], false)) {
                messages[i][1].push(d);
                if (d[0] && messages[i][0] && d[0].qos > messages[i][0].qos) {
                    messages[i][0].qos = d[0].qos;
                }
                foundMessage = true;
                break;
            }
        }

        if (!foundMessage) {
            messages.push([d[0], [d]]);
        }
    });



    return messages;
}