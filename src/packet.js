
export default class Packet {
    static equals(a, b, checkQos = true) {
        return a === b ||
            (
                a && b &&
                a.topic === b.topic &&
                (!checkQos || a.qos === b.qos) &&
                (
                    (a.payload instanceof Buffer &&
                        b.payload instanceof Buffer &&
                        a.payload.length === b.payload.length &&
                        Buffer.compare(a.payload, b.payload) === 0
                    )
                    ||
                    (a.payload instanceof String &&
                        b.payload instanceof String &&
                        a === b.payload
                    )
                ));
    }

}