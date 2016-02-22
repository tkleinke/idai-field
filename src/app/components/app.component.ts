import {Component, OnInit, Inject} from 'angular2/core';
import {RouteConfig,RouterLink,RouterOutlet} from 'angular2/router';
import {View} from "angular2/core";
import {OverviewComponent} from './overview.component';
import {SynchronizationComponent} from "./synchronization.component";
import {Datastore} from "../services/datastore";
import {OBJECTS} from "../services/sample-objects";
import {IdaiFieldBackend} from "../services/idai-field-backend";
import {MessagesComponent} from "./messages.component";

@Component({
    selector: 'idai-field-app',
    templateUrl: 'templates/app.html',
    directives: [RouterOutlet, RouterLink, SynchronizationComponent, MessagesComponent]
})
@RouteConfig([
    { path: "/", name: "Overview", component: OverviewComponent, useAsDefault: true}
])
export class AppComponent implements OnInit {

    constructor(private datastore: Datastore,
                private idaiFieldBackend: IdaiFieldBackend,
            @Inject('app.config') private config,
            @Inject('app.dataModelConfig') private dataModelConfig) {
    }

    ngOnInit() {
        if (this.config.environment == 'test') this.loadSampleData();
    }

    loadSampleData(): void {

        this.datastore.clear()
        .then(() => {
            var promises = [];
            for (var ob of OBJECTS) promises.push(this.datastore.create(ob));
            Promise.all(promises).then(
                () => console.log("Successfully stored sample objects"))
            .catch(
                err => console.error("Problem when storing sample data", err)
            );
        });
        this.idaiFieldBackend.resetIndex().then(
            () => console.log("Successfully cleared backend repository"))
        .catch(
            err => console.error("Could not clear backend repository")
        );
    }
}