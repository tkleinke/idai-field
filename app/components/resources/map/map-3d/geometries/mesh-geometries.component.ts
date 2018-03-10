import * as THREE from 'three';
import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {IdaiFieldDocument} from 'idai-components-2/idai-field-model';
import {Map3DComponent} from '../map-3d.component';
import {MeshGeometryManager} from './mesh-geometry-manager';
import {addOffset} from '../../../../../util/util-3d';


@Component({
    moduleId: module.id,
    selector: 'mesh-geometries',
    templateUrl: './mesh-geometries.html'
})
/**
 * @author Thomas Kleinke
 */
export class MeshGeometriesComponent implements OnChanges {

    @Input() documents: Array<IdaiFieldDocument>;
    @Input() hoverDocument: IdaiFieldDocument;
    @Input() meshGeometryManager: MeshGeometryManager;

    public showLineGeometries: boolean = true;
    public showPolygonGeometries: boolean = true;


    constructor(private map3DComponent: Map3DComponent) {}


    async ngOnChanges(changes: SimpleChanges) {

        if (changes['documents'] && this.documents) await this.update();
    }


    public getGeometryInfoPosition(): THREE.Vector2|undefined {

        if (!this.hoverDocument) return;

        const mesh: THREE.Mesh|undefined = this.meshGeometryManager.getMesh(this.hoverDocument);
        if (!mesh) return;

        const centerPosition: THREE.Vector3 = addOffset(mesh.geometry.boundingSphere.center, mesh.position);

        return this.map3DComponent.getViewer().getCanvasCoordinates(centerPosition);
    }


    public async toggleLineGeometries() {

        this.showLineGeometries = !this.showLineGeometries;
        await this.update();
    }


    public async togglePolygonGeometries() {

        this.showPolygonGeometries = !this.showPolygonGeometries;
        await this.update();
    }


    private async update() {

        await this.meshGeometryManager.update(this.documents, this.showLineGeometries,
            this.showPolygonGeometries);
    }
}