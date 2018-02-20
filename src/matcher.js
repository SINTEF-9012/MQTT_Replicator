import qlobber from 'qlobber';

const qlobberSettingsForMqtt = {
    separator: '/',
    wildcard_one: '+',
    wildcard_some: '#'
};

export default function newMatcher() {
    return new qlobber.Qlobber(qlobberSettingsForMqtt);
}