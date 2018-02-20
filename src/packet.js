
export default class Packet {
    static equals(a, b, checkQos = true) {
        return a === b ||
            (
                a && b &&
                a.topic === b.topic &&
                (!checkQos || a.qos === b.qos) &&
                (
                    // Compare binary messages
                    (a.payload instanceof Buffer &&
                        b.payload instanceof Buffer &&
                        a.payload.length === b.payload.length &&
                        Buffer.compare(a.payload, b.payload) === 0
                    )
                    ||
                    // Compare string messages
                    (a.payload instanceof String &&
                        b.payload instanceof String &&
                        a.payload === b.payload
                    )
                    ||
                    // Empty binary and empty string messages
                    // are equals
                    (
                        a.payload !== undefined &&
                        b.payload !== undefined &&
                        a.payload.length === 0 &&
                        b.payload.length === 0
                    )
                ));
    }

}