import {Component, Input} from '@angular/core';
import {Resource} from 'idai-components-2/core';
import {DocumentEditChangeMonitor} from '../document-edit-change-monitor';


@Component({
    selector: 'dai-dropdown',
    template: `<select [(ngModel)]="resource[field.name]" (change)="setValue($event.target.value)"
                       class="form-control">
        <option value="" [selected]="!resource.hasOwnProperty(field.name)"></option>
        <option *ngFor="let item of field.valuelist" value="{{item}}">{{item}}</option>
    </select>`
})

/**
 * @author Fabian Z.
 */
export class DropdownComponent {

    @Input() resource: Resource;
    @Input() field: any;


    constructor(private documentEditChangeMonitor: DocumentEditChangeMonitor) {}


    public setValue(value: any) {
        
        if (value == '') delete this.resource[this.field.name];
        this.documentEditChangeMonitor.setChanged();
    }
}