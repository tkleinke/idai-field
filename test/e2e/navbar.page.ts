import {browser, protractor, element, by} from 'protractor';
let EC = protractor.ExpectedConditions;
let delays = require('./config/delays');


export class NavbarPage {

    // click

    public static clickNavigateToProject() {
        browser.wait(EC.visibilityOf(element.all(by.css('.nav-link')).get(0)), delays.ECWaitTime);
        return element.all(by.css('.nav-link')).get(0).click();
    }

    public static clickNavigateToExcavation() {
        browser.wait(EC.visibilityOf(element.all(by.css('.nav-link')).get(1)), delays.ECWaitTime);
        return element.all(by.css('.nav-link')).get(1).click();
    };

    public static clickNavigateToBuilding() {
        browser.wait(EC.visibilityOf(element.all(by.css('.nav-link')).get(2)), delays.ECWaitTime);
        return element.all(by.css('.nav-link')).get(2).click();
    };

    public static clickNavigateToSettings() {
        browser.wait(EC.visibilityOf(element.all(by.css('.nav-link')).get(6)), delays.ECWaitTime);
        return element.all(by.css('.nav-link')).get(6).click();
    };

    public static clickConflictsButton() {
        browser.wait(EC.visibilityOf(element(by.id('taskbar-conflicts-button'))), delays.ECWaitTime);
        return element(by.id('taskbar-conflicts-button')).click();
    };

    public static clickConflictResolverLink(identifier) {
        browser.wait(EC.visibilityOf(element(by.id('taskbar-conflict-' + identifier))), delays.ECWaitTime);
        return element(by.id('taskbar-conflict-' + identifier)).click();
    };

    public static clickSelectProject = function(option) {
        browser.wait(EC.presenceOf(element(by.id('projectSelectBox'))), delays.ECWaitTime);
        element.all(by.css('#projectSelectBox option')).get(option).click();
    };

    // unused?
    public static clickCloseMessage() {
        browser.wait(EC.visibilityOf(element(by.css('#message-0 button'))), delays.ECWaitTime);
        element(by.css('#message-0 button')).click();
    };

    // await

    public static awaitAlert(text, matchExactly = true) {
        if (matchExactly) {
            browser.wait(EC.presenceOf(element(by.xpath("//span[@class='message-content' and normalize-space(text())='"+text+"']"))), delays.ECWaitTime);
        }
        else {
            browser.wait(EC.presenceOf(element(by.xpath("//span[@class='message-content' and contains(text(),'"+text+"')]"))), delays.ECWaitTime);
        }
    };

    // get text

    public static getMessageText() {
        browser.sleep(200);
        browser.ignoreSynchronization = true;
        let text =  element(by.id('message-0')).getText();
        browser.ignoreSynchronization = false;
        return text;
    };

    public static getActiveNavLinkLabel() {
        browser.wait(EC.visibilityOf(element(by.css('.nav-link.active'))), delays.ECWaitTime);
        return element(by.css('.nav-link.active')).getText();
    }
}