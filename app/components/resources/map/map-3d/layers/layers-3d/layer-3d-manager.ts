import {Injectable} from '@angular/core';
import {Document} from 'idai-components-2/core';
import {IdaiFieldDocument} from 'idai-components-2/idai-field-model';
import {ViewFacade} from '../../../../view/view-facade';
import {ListUtil} from '../../../../../../util/list-util';
import {LayerManager, LayersInitializationResult, ListDiffResult} from '../../../layer-manager';
import {IdaiField3DDocumentReadDatastore} from '../../../../../../core/datastore/idai-field-3d-document-read-datastore';
import {IdaiField3DDocument} from '../../../../../../core/model/idai-field-3d-document';


@Injectable()
/**
 * @author Thomas Kleinke
 */
export class Layer3DManager extends LayerManager<Document> {

    constructor(private datastore: IdaiField3DDocumentReadDatastore,
                viewFacade: ViewFacade) {

        super(viewFacade);
    }


    public async initializeLayers(mainTypeDocument: IdaiFieldDocument | undefined)
            : Promise<LayersInitializationResult<IdaiField3DDocument>> {

        try {
            return {
                layers: (await this.datastore.find({
                    q: '',
                    types: ['Object3D'],
                    constraints: { 'georeferenced:exist': 'KNOWN' }
                })).documents,
                activeLayersChange: this.fetchActiveLayersFromResourcesState(mainTypeDocument)
            };
        } catch(e) {
            console.error('Error in datastore.find', e);
        }

        return Promise.reject(undefined);
    }


    private fetchActiveLayersFromResourcesState(mainTypeDocument: IdaiFieldDocument | undefined)
            : ListDiffResult {

        const newActiveLayerIds = mainTypeDocument ?
            this.viewFacade.getActive3DLayersIds(mainTypeDocument.resource.id as any) : [];
        const oldActiveLayerIds = this.activeLayerIds.slice(0);
        this.activeLayerIds = newActiveLayerIds;

        return {
            removed: ListUtil.subtract(oldActiveLayerIds, newActiveLayerIds),
            added: ListUtil.subtract(newActiveLayerIds, oldActiveLayerIds),
        };
    }


    protected saveActiveLayerIds(mainTypeDocument: IdaiFieldDocument) {

        this.viewFacade.setActive3DLayersIds(mainTypeDocument.resource.id as any,
            this.activeLayerIds);
    }
}