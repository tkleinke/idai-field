import {Component, Input} from '@angular/core';
import {ResourcesComponent} from '../resources.component';
import {Loading} from '../../widgets/loading';
import {ViewFacade} from '../view/view-facade';
import {IdaiFieldDocument, IdaiFieldGeometry} from 'idai-components-2/idai-field-model';
import {RoutingHelper} from "../service/routing-helper";
import {MapWrapperComponent} from './resources-map.component';

@Component({
    selector: 'sidebar-list',
    moduleId: module.id,
    templateUrl: './sidebar-list.html'
})
/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 * @author Sebastian Cuy
 */
export class SidebarListComponent {

    @Input() activeTab: string;

    constructor(
        public resourcesComponent: ResourcesComponent,
        public mapWrapperComponent: MapWrapperComponent,    // TODO Check if it's possible to get rid of the dependency
        public viewFacade: ViewFacade,
        private routingHelper: RoutingHelper,
        private loading: Loading
    ) { }


    public selectInMainTypeView(document: IdaiFieldDocument) {

        this.routingHelper.jumpToMainTypeHomeView(document);
    }


    public select(document: IdaiFieldDocument, autoScroll: boolean = false) {

        this.resourcesComponent.isEditingGeometry = false;

        if (!document) {
            this.viewFacade.deselect();
        } else {
            this.viewFacade.setSelectedDocument(document);
        }

        if (autoScroll) this.resourcesComponent.setScrollTarget(document);
    }


    public showPlusButton() { // TODO check if this is a duplication with the one from resources component

        return (!this.resourcesComponent.isEditingGeometry && this.resourcesComponent.ready
        && !this.loading.showIcons && this.viewFacade.getQuery().q == ''
        && (this.viewFacade.isInOverview() || this.viewFacade.getSelectedOperationTypeDocument()));
    }
}