require('dotenv').config();
const fs = require('fs');
const util = require('util');
const csv = require('neat-csv');
const Rail = require('national-rail-darwin-promise');
const SlashEmitter = require('slack-slash-fastify');

const slash = new SlashEmitter({secret: process.env.SLACK_SIGNING_SECRET});
const rail = new Rail(process.env.DARWIN_TOKEN);
let stations = [];

// get station details for a lookup string
async function getStation(lookup) {
    // load station details
    if (!stations.length) {
        const file = await util.promisify(fs.readFile)('config/station_codes.csv', 'utf8');
        stations = await csv(file, {
            mapHeaders: h => ['station', 'code'][h.index]
        });
    }

    lookup = lookup.toLowerCase();
    return stations.find(s => (s.code.toLowerCase() == lookup || s.station.toLowerCase() == lookup));
}

slash.on('slash:trains', async function(args, reply) {
    if (args.length != 2) {
        return reply({
            response_type: 'ephemeral',
            text: 'You should type `/trains FROM TO` to get a departure board.',
        });
    }

    let [from, to] = await Promise.all(args.map(getStation)),
        limit = 3,
        departures = {};

    if (!from) {
        return reply({
            response_type: 'ephemeral',
            text: 'I could not recognise `' + args[0] + '`',
        });
    }

    if (!to) {
        return reply({
            response_type: 'ephemeral',
            text: 'I could not recognise `' + args[1] + '`',
        });
    }

    try {
        departures = await rail.getDepartureBoard(from.code, {destination: to.code});
    } catch (err) {
        console.error(err.body || err);

        return reply({
            response_type: 'ephemeral',
            text: 'Sorry! There was an error connecting to the rail service.',
        })
    }

    // build departure list fields
    let fields = departures.trainServices.slice(0, limit).reduce(function (fields, dep) {
        let marker = (dep.etd == 'On time' ? '' : ':warning: ');
        fields.push({
            type: 'mrkdwn',
            text: '*' + dep.std + '* ' + dep.destination.name,
        }, {
            type: 'mrkdwn',
            text: marker + (dep.platform ? 'Plat ' + dep.platform + ', ' : '')
                + (dep.etd == 'On time' ? dep.etd : 'Exp *' + dep.etd + '*'),
        });

        return fields;
    }, []);

    // if there are no trains
    if (!fields.length) {
        return reply({
            response_type: 'in_channel',
            text: util.format('Sorry, there are no upcoming trains from %s to %s!', from.station, to.station),
        });
    }

    // reply to user
    let text = util.format('The next %d departures from *%s* to *%s* are:', fields.length / 2, from.station, to.station);
    reply({
        response_type: 'in_channel',
        text: text,
        blocks: [{
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: ':train2: ' + text,
            },
            fields: fields
        }],
    });
});
