import {Injectable} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {Document, ProjectConfiguration} from 'idai-components-2/core';
import {ViewFacade} from './resources/state/view-facade';
import {DocumentReadDatastore} from '../core/datastore/document-read-datastore';
import {TypeUtility} from '../core/model/type-utility';


@Injectable()
/**
 * Centralizes access to the Router.
 * Has knowledge about how to route into as well as route within
 * bigger components like ResourcesComponent (via ViewFacade).
 *
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 * @author Sebastian Cuy
 */
export class RoutingService {

    private currentRoute: any;


    constructor(private router: Router,
                private viewFacade: ViewFacade,
                private location: Location,
                private typeUtility: TypeUtility,
                private projectConfiguration: ProjectConfiguration,
                private datastore: DocumentReadDatastore) {}


    // For ResourcesComponent
    public routeParams(route: ActivatedRoute) {

        return Observable.create((observer: Observer<any>) => {
            this.setRoute(route, observer);
        });
    }


    public async jumpToMainTypeHomeView(document: Document) {

        await this.router.navigate(['resources',
            this.viewFacade.getMainTypeHomeViewName(document.resource.type)]);

        await this.viewFacade.selectOperationTypeDocument(document);
    }


    // Currently used from DocumentViewSidebar and ImageViewComponent
    public jumpToRelationTarget(documentToSelect: Document, tab?: string,
                                comingFromOutsideResourcesComponent: boolean = false) {

        if (comingFromOutsideResourcesComponent) this.currentRoute = undefined;

        if (this.typeUtility.isSubtype(documentToSelect.resource.type, 'Image')) {
            this.jumpToImageTypeRelationTarget(documentToSelect, comingFromOutsideResourcesComponent);
        } else {
            this.jumpToResourceTypeRelationTarget(
                documentToSelect, tab, comingFromOutsideResourcesComponent);
        }
    }


    public async jumpToConflictResolver(document: Document) {

        if (this.typeUtility.isSubtype(document.resource.type, 'Image')) {
            return this.router.navigate(['images', document.resource.id, 'edit', 'conflicts']);
        } else {
            const mainTypeName = await this.getMainTypeNameForDocument(document);
            const viewName = this.viewFacade.getMainTypeHomeViewName(mainTypeName);
            await this.router.navigate(['resources', viewName]); // indirect away first to reload the resources component, in case you are already there
            return this.router.navigate(['resources', viewName, document.resource.id, 'edit', 'conflicts']);
        }
    }


    public async getMainTypeNameForDocument(document: Document): Promise<string> {

        if (this.typeUtility.isSubtype(document.resource.type, 'Operation')
                || document.resource.type === 'Place') return 'Project';

        if (!document.resource.relations['isRecordedIn']
            || document.resource.relations['isRecordedIn'].length === 0) return 'Project';

        return this.datastore
            .get(document.resource.relations['isRecordedIn'][0])
            .then(target => target.resource.type);
    }


    private jumpToImageTypeRelationTarget(documentToSelect: Document, comingFromOutsideResourcesComponent: boolean) {

        const selectedDocument = this.viewFacade.getSelectedDocument();
        if (selectedDocument) {
            if (this.currentRoute && selectedDocument.resource && selectedDocument.resource.id) {
                this.currentRoute += '/' + selectedDocument.resource.id + '/show/images';
            }
        }

        this.router.navigate(
            ['images', documentToSelect.resource.id, 'show', comingFromOutsideResourcesComponent ? 'fields' : 'relations'],
            { queryParams: { from: this.currentRoute } }
        );
    }


    private async jumpToResourceTypeRelationTarget(documentToSelect: Document, tab?: string,
                                                   comingFromOutsideResourcesComponent: boolean = false) {

        const viewName = await this.viewFacade.getMainTypeHomeViewName(
            await this.getMainTypeNameForDocument(documentToSelect));

        if (comingFromOutsideResourcesComponent || viewName != this.viewFacade.getCurrentViewName()) {
            this.router.navigate(tab ?
                ['resources', viewName, documentToSelect.resource.id, 'view', tab] :
                ['resources', viewName, documentToSelect.resource.id]);
        } else {
            this.viewFacade.setSelectedDocument(documentToSelect)
        }
    }


    // For ResourcesComponent
    private setRoute(route: ActivatedRoute, observer: Observer<any>) { // we need a setter because the route must come from the componenent it is bound to

        route.params.subscribe(async (params) => {

            this.currentRoute = undefined;
            if (params['view']) this.currentRoute = 'resources/' + params['view'];

            this.location.replaceState('resources/' + params['view']);

            try {
                await this.viewFacade.selectView(params['view']);
                observer.next(params);
            } catch (msgWithParams) {
                if (msgWithParams) console.error(
                    'got msgWithParams in GeneralRoutingService#setRoute: ', msgWithParams);
            }
        });
    }
}