import {Component, OnInit, ViewChild, TemplateRef} from '@angular/core';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {Messages} from 'idai-components-2/messages';
import {SettingsService} from './settings/settings-service';
import {M} from './m';

@Component({
    selector: 'projects',
    moduleId: module.id,
    templateUrl: './projects.html',
    host: {
        '(document:click)': 'handleClick($event)',
    }
})

/**
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 */
export class ProjectsComponent implements OnInit {

    public ready: boolean = false;
    public projects: string[];
    public selectedProject: string;
    public newProject: string = '';
    public projectToDelete: string = '';

    @ViewChild('projectsModalTemplate') public modalTemplate: TemplateRef<any>;
    @ViewChild('popover') private popover;
    @ViewChild('deletePopover') private deletePopover;

    private modalRef: NgbModalRef;

    constructor(private settingsService: SettingsService,
                private modalService: NgbModal,
                private messages: Messages) {
    }

    ngOnInit() {

        this.settingsService.ready.then(() => {
            this.ready = true;
            this.selectedProject = this.settingsService.getSelectedProject();
            this.projects = this.settingsService.getProjects().slice(0);
        });
    }

    public openModal() {

        this.modalRef = this.modalService.open(this.modalTemplate);
    }

    public closeModal() {

        this.modalRef.close();
    }

    public reset() {

        this.projectToDelete = '';
        this.newProject = '';
    }

    public selectProject() {

        return this.switchProjectDb();
    }

    public createProject() {

        if (this.newProject == '') {
            return this.messages.add([M.RESOURCES_ERROR_NO_PROJECT_NAME]);
        }

        if (this.projects.indexOf(this.newProject) > -1) {
            return this.messages.add([M.RESOURCES_ERROR_PROJECT_NAME_EXISTS, this.newProject]);
        }

        this.projects.unshift(this.newProject);
        this.selectedProject = this.newProject;
        this.switchProjectDb();
    }

    public deleteProject() {

        if (!this.canDeleteProject()) return this.deletePopover.close();

        const projectToDelete = this.selectedProject;
        this.projects.splice(this.projects.indexOf(this.selectedProject), 1);
        this.selectedProject = this.projects[0];
        this.selectProject()
            .then(() => this.settingsService.deleteProject(projectToDelete))
            .then(() => {
                this.messages.add([M.RESOURCES_SUCCESS_PROJECT_DELETED]);
            },error => {
                console.error("error while trying to destroy the database",error);
                this.messages.add([M.RESOURCES_ERROR_PROJECT_DELETED]);
            })
            .then(() => {
                this.deletePopover.close();
            });

    }

    public canDeleteProject() {

        if (!this.projectToDelete || (this.projectToDelete == '')) {
            return false;
        }
        if (this.projectToDelete != this.selectedProject) {
            this.messages.add([M.RESOURCES_ERROR_PROJECT_NAME_NOT_SAME]);
            return false;
        }
        if (this.projects.length < 2) {
            this.messages.add([M.RESOURCES_ERROR_ONE_PROJECT_MUST_EXIST]);
            return false;
        }
        return true;
    }


    private switchProjectDb() {

        return this.settingsService.setProjectSettings(this.projects, this.selectedProject)
            .then(() => window.location.reload());
    }

    private handleClick(event) {

        if (!this.popover) return;

        let target = event.target;
        let inside = false;

        do {
            if (target.id == 'new-project-button' || target.id == 'new-project-menu') {
                inside = true;
                break;
            }
            target = target.parentNode;
        } while (target);

        if (!inside) this.popover.close();
    }
}