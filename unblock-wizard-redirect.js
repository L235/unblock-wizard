/**
 * MediaWiki:Unblock-wizard-redirect.js
 *
 * JavaScript used for submitting unblock requests.
 * Additional script for MediaWiki:Unblock-wizard.js parsing blocks and redirecting users to the correct page.
 * Used on [[Wikipedia:Unblock wizard]].
 * Loaded via [[mw:Snippets/Load JS and CSS by URL]].
 * 
 * Edits can be proposed via [[Wikipedia talk:Unblock wizard]].
 *
 * Author: [[User:Chaotic Enby]] (derived from a script by [[User:SD0001]])
 * Licence: MIT
 */

/* jshint maxerr: 999 */
/* globals mw, $, OO */
/* <nowiki> */

(function () {

$.when(
	$.ready,
	mw.loader.using([
		'mediawiki.util', 'mediawiki.api', 'mediawiki.Title',
		'mediawiki.widgets', 'oojs-ui-core', 'oojs-ui-widgets'
	])
).then(function () {
	if (!(mw.config.get('wgPageName') == 'Wikipedia:Unblock_wizard' || mw.config.get('wgPageName') == 'User:Chaotic_Enby/Unblock_wizard') ||
		mw.config.get('wgAction') !== 'view') {
		return;
	}
	init();
});

// For each block template, links the relevant subpage
var blockTemplates = {
	"test": "test",
};

function init() {
	for (var key in messages) {
		mw.messages.set('afcsw-' + key, messages[key]);
	}
	
	var apiOptions = {
		parameters: {
			format: 'json',
			formatversion: '2'
		},
		ajax: {
			headers: {
				'Api-User-Agent': 'w:en:MediaWiki:Unblock-wizard-redirect.js'
			}
		}
	};
	
	afc.api = new mw.Api(apiOptions);
	afc.lookupApi = new mw.Api(apiOptions);
	
	afc.lookupApi.get({
		"action": "query",
		"meta": "userinfo",
		"uiprop": "blockinfo"
	}).then( setBlockData ).then( function ( reason ) {
		if(reason) {
			targetPage = mw.config.get('wgPageName') + '/' + blockTemplates[reason];
			// TODO
		}
	});
	
	function setBlockData(json) {
		var userinfo = json.query.userinfo;
		var errors = errorsFromPageData(userinfo);
		if (errors.length) {
			return null;
		}
		if("blockid" in userinfo){
			block.id = userinfo.blockid;
			block.by = userinfo.blockedby;
			block.reason = userinfo.blockreason;
			return block.reason;
		}
		return null;
	}
}

})(); // File-level closure to protect functions from being exposed to the global scope or overwritten

/* </nowiki> */
