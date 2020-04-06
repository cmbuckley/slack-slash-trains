---
layout: showcase
title: slack-slash-trains
---

A Slack slash handler using [slack-slash-fastify](/slack-slash-fastify/) to output live departure boards from National Rail feeds.

## Usage

First, [register for OpenLDBWS](http://realtime.nationalrail.co.uk/OpenLDBWSRegistration/) to obtain a token for Darwin.

Then, [create a Slack app](https://api.slack.com/apps) adn set up a Slash Command for `/train`. Grab the signing secret while you’re there.

Then create a `.env` file with the following:

```
SLACK_SIGNING_SECRET=slacksecret
DARWIN_TOKEN=darwintoken
```

The station codes can be updated from [the National Rail website](https://www.nationalrail.co.uk/stations_destinations/48541.aspx).
