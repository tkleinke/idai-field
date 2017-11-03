import {browser, protractor, element, by} from 'protractor';
import {NavbarPage} from '../navbar.page';
import {ResourcesPage} from './resources.page';
import {SearchBarPage} from '../widgets/search-bar.page';

const delays = require('../config/delays');
const EC = protractor.ExpectedConditions;

describe('resources/list --', () => {

    let index = 0;


    beforeAll(function() {
        ResourcesPage.get();
        ResourcesPage.clickListModeButton();
    });


    beforeEach(() => {
        if (index > 0) {
            NavbarPage.performNavigateToSettings();
            require('request').post('http://localhost:3003/reset', {});
            browser.sleep(delays.shortRest);
            NavbarPage.clickNavigateToExcavation();
            ResourcesPage.clickListModeButton();
            browser.sleep(delays.shortRest);
        }
        index++;
    });


    xit('show newly created resource in list view', () => {

        ResourcesPage.performCreateResource('1', 'feature-architecture', 'shortDescription', 'Resource 1', true);

        ResourcesPage.getListModeInputFieldValue('1', 0).then(inputValue => expect(inputValue).toEqual('1'));

        ResourcesPage.getListModeInputFieldValue('1', 1).then(inputValue => expect(inputValue).toEqual('Resource 1'));
    });


    xit('save changes on input field blur', () => {

        ResourcesPage.performCreateResource('1', 'feature-architecture', 'shortDescription', 'Resource 1', true);
        ResourcesPage.performCreateResource('2', 'feature-architecture', 'shortDescription', 'Resource 2', true);

        ResourcesPage.typeInListModeInputField('1', 1, 'Changed resource 1');
        ResourcesPage.getListModeInputField('2', 0).click();

        expect(NavbarPage.getMessageText()).toContain('erfolgreich');
        NavbarPage.clickCloseAllMessages();
    });


    xit('restore identifier from database if a duplicate identifier is typed in', () => {

        ResourcesPage.performCreateResource('1', 'feature-architecture', 'shortDescription', 'Resource 1', true);
        ResourcesPage.performCreateResource('2', 'feature-architecture', 'shortDescription', 'Resource 2', true);
        ResourcesPage.performCreateResource('3', 'feature-architecture', 'shortDescription', 'Resource 3', true);

        ResourcesPage.typeInListModeInputField('2', 0, '1');
        ResourcesPage.getListModeInputField('3', 0).click();

        expect(NavbarPage.getMessageText()).toContain('existiert bereits');

        ResourcesPage.getListModeInputFieldValue('2', 0).then(inputValue => expect(inputValue).toEqual('2'));
    });


    it('perform a fulltext search', () => {

        browser.wait(EC.invisibilityOf(ResourcesPage.getListItemEl('testf1')), delays.ECWaitTime);

        SearchBarPage.typeInSearchField('testf1');
        browser.wait(EC.visibilityOf(ResourcesPage.getListItemEl('testf1')), delays.ECWaitTime);
        expect(ResourcesPage.getListItemEl('context1').getAttribute('class')).toContain('no-search-result');

        SearchBarPage.typeInSearchField(' ');
        browser.wait(EC.invisibilityOf(ResourcesPage.getListItemEl('testf1')), delays.ECWaitTime);
        expect(ResourcesPage.getListItemEl('context1').getAttribute('class')).not.toContain('no-search-result');
    });


    it('perform a type filter search', () => {

        browser.wait(EC.invisibilityOf(ResourcesPage.getListItemEl('testf1')), delays.ECWaitTime);

        SearchBarPage.clickChooseTypeFilter('find');
        browser.wait(EC.visibilityOf(ResourcesPage.getListItemEl('testf1')), delays.ECWaitTime);
        expect(ResourcesPage.getListItemEl('context1').getAttribute('class')).toContain('no-search-result');

        SearchBarPage.clickChooseTypeFilter('all');
        browser.wait(EC.invisibilityOf(ResourcesPage.getListItemEl('testf1')), delays.ECWaitTime);
        expect(ResourcesPage.getListItemEl('context1').getAttribute('class')).not.toContain('no-search-result');
    });
});