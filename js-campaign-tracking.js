/*
 * This file is part of js-campaign-tracking
 *
 * Copyright (c) 2015, Slickdeals, LLC
 * 
 * For the full copyright and license information, please view the LICENSE file that was distributed with this source code
 */
(function (window)
{
    var parseQueryString = function (queryString)
    {
        if (!queryString.length) return {};
        var queryStringKVPairs = queryString.split('&'),
                queryMap = {};


        for (var i = 0; i < queryStringKVPairs.length; i++)
        {
            var kv = queryStringKVPairs[i].split('=');
            queryMap[decodeURIComponent(kv.shift())] = decodeURIComponent(kv.join('='));
        }

        return queryMap;
    };

    var parseGacSessionData = function (cookieString)
    {
        var gaqCookie = cookieString.match(/__utmz=(?:[0-9]+\.)+([^;]+)/);

        if (!gaqCookie) return {};
        var parameters = ("|" + gaqCookie[1]).match(/\|utmc[a-z]{2}=.*?(?=\|utm|$)/g);
        var campaign = {};
        for (var i = 0; i < parameters.length; i++)
        {
            var kv = parameters[i].substr(1).split('=');
            var k = kv.shift();
            var v = decodeURIComponent(kv.join('='));

            if (k == 'utmcsr') campaign.source = v;
            if (k == 'utmccn') campaign.campaign = v;
            if (k == 'utmcmd') campaign.medium = v;
            if (k == 'utmctr') campaign.term = v;
            if (k == 'utmcct') campaign.content = v;
        }

        return campaign;
    };

    var hasGacActiveCookie = function (cookieString)
    {
        return !!cookieString.match(/__utmb=[^;]+/);
    };

    var compareCampaigns = function (c1, c2)
    {
        if (c1.source != c2.source) return false;
        if (c1.campaign != c2.campaign) return false;
        if (c1.medium != c2.medium) return false;
        if (c1.term != c2.term) return false;
        return c1.content == c2.content;
    };

    var jct = function (queryMap, previousCampaign, referrerHost, referrerPath, currentHost, isNew)
    {
        this.queryMap = queryMap;
        this.previousCampaign = previousCampaign;
        this.referrerHost = referrerHost;
        this.referrerPath = referrerPath;
        this.currentHost = currentHost;
        this.overrideCampaign = {};
        this.isNew = isNew;
    };

    jct.prototype.getCampaignData = function ()
    {
        var campaign = {};

        if (this.queryMap.gclid || this.queryMap.gclsrc)
        {
            campaign.source = 'google';
            campaign.medium = 'cpc';
            campaign.campaign = this.queryMap.utm_campaign;
            campaign.term = this.queryMap.utm_term;
            campaign.content = this.queryMap.utm_content;
        }
        else if (this.overrideCampaign.source)
        {
            campaign.source = this.overrideCampaign.source;
            campaign.medium = this.overrideCampaign.medium || '(not set)';
            campaign.campaign = this.overrideCampaign.campaign || '(not set)';
            campaign.term = this.overrideCampaign.term || '(not set)';
            campaign.content = this.overrideCampaign.content || '(not set)';
        }
        else if (this.queryMap.utm_source)
        {
            campaign.source = this.queryMap.utm_source;
            campaign.medium = this.queryMap.utm_medium;
            campaign.campaign = this.queryMap.utm_campaign;
            campaign.term = this.queryMap.utm_term;
            campaign.content = this.queryMap.utm_content;
        }
        else
        {
            if (this.referrerHost && this.referrerHost != this.currentHost)
            {
                campaign.source = this.referrerHost;
                campaign.medium = 'referral';
                campaign.campaign = '(referral)';
                campaign.term = '(not set)';
                campaign.content = this.referrerPath;
            }
            else
            {
                campaign.source = this.previousCampaign.source || '(direct)';
                campaign.medium = this.previousCampaign.medium || '(none)';
                campaign.campaign = this.previousCampaign.campaign || '(direct)';
                campaign.term = this.previousCampaign.term || '(not set)';
                campaign.content = this.previousCampaign.content || '(not set)';
            }
        }
        campaign.isNew = this.isNew || !compareCampaigns(campaign, this.previousCampaign);

        return campaign;
    };

    jct.track = function (campaign)
    {
        var referrerData = document.referrer.match(/^https?:\/\/([^/]+)(\/.*)$/);
        var rHost = referrerData ? referrerData[1] : null;
        var rPath = referrerData ? referrerData[2] : null;

        var tracker = new jct(parseQueryString(window.location.search.substr(1)), parseGacSessionData(window.document.cookie), rHost, rPath, window.location.hostname, !hasGacActiveCookie(window.document.cookie));
        if (campaign) tracker.overrideCampaign = campaign;
        return tracker.getCampaignData();
    };

    window.jct = jct;
})(window);
