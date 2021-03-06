import {IdaiFieldDocument} from 'idai-components-2';


export type Map3DAction = 'drag'|'changeAngle'|'none';


/**
 * @author Thomas Kleinke
 */
export interface Map3DControlState {

    action: Map3DAction;
    hoverDocument?: IdaiFieldDocument;
    selectedDocument?: IdaiFieldDocument;
}