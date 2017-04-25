import {browser, protractor, element, by} from 'protractor';

'use strict';

let common = require('./common.js');
let EC = protractor.ExpectedConditions;
let delays = require('./config/delays');


/**
 * @author Thomas Kleinke
 */
let SettingsPage = function() {

    this.get = function() {
        return browser.get('#/settings');
    };

    this.clickSaveSettingsButton = function() {
        browser.wait(EC.visibilityOf(element(by.id('save-settings-button'))), delays.ECWaitTime);
        element(by.id('save-settings-button')).click();
    };

    this.clickAddRemoteSiteButton = function() {
        browser.wait(EC.visibilityOf(element(by.id('add-remote-site-button'))), delays.ECWaitTime);
        element(by.id('add-remote-site-button')).click();
    };

    this.getRemoteSiteInput = function() {
        browser.wait(EC.visibilityOf(element(by.id('remote-sites-list')).all(by.css('input')).get(0)),
            delays.ECWaitTime);
        return element(by.id('remote-sites-list')).all(by.css('input')).get(0);
    };

    this.typeInRemoteSiteAddress = function(address) {
        common.typeIn(this.getRemoteSiteInput(), address);
    };

    this.getRemoteSiteAddress = function() {
        return this.getRemoteSiteInput().getAttribute('value');
    }

};

module.exports = new SettingsPage();