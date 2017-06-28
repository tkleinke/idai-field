import {M} from "../../app/m";
import * as PouchDB from "pouchdb";
/**
 * @author Sebastian Cuy
 */

// override nodes require function in order to make special
// systemjs requires starting with '@node' work
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
    if (arguments[0].startsWith('@node')) arguments[0] = arguments[0].substring(6);
    return originalRequire.apply(this, arguments);
};

import {PouchDbFsImagestore} from "../../app/imagestore/pouch-db-fs-imagestore";

import fs = require('fs');
import rimraf = require('rimraf');
import {PouchdbManager} from "../../app/datastore/pouchdb-manager";

// helper functions for converting strings to ArrayBuffers and vice versa
function str2ab(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length); // 2 bytes for each char
    const bufView = new Uint8Array(buf);
    for (let i=0, strLen=str.length; i<strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function ab2str(buf: ArrayBuffer): string {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

describe('PouchDbFsImagestore', () => {


    let store: PouchDbFsImagestore;
    let manager: PouchdbManager;
    const storeProjectPath = 'store/unittest/';

    beforeEach(() => {
        const mockBlobMaker = jasmine.createSpyObj('blobProxy',['makeBlob']);
        mockBlobMaker.makeBlob.and.callFake((data)=>{return data});
        const mockConverter = jasmine.createSpyObj('converter',['convert']);
        mockConverter.convert.and.callFake((data)=>{return data});
        const mockConfigProvider =  jasmine.createSpyObj('configProvider',['getProjectConfiguration']);
        mockConfigProvider.getProjectConfiguration.and.callFake(()=>{return {}});

        manager = new PouchdbManager(mockConfigProvider);
        manager.select('unittest');

        store = new PouchDbFsImagestore(mockConverter, mockBlobMaker, 'store/', manager);
        store.select('unittest');
    });

    afterEach(done => {
        rimraf(storeProjectPath, () => {
            manager.destroy().then(done);
        });

    });

    it('should create a file', (done) => {

        console.log("should create a file");

        store.create('test_create', str2ab('asdf')).then(() => {
            fs.readFile(storeProjectPath + 'test_create', (err, data) => {
                if (err) fail(err);
                expect(data.toString()).toEqual('asdf');
                done();
            });
        }).catch(err => {
            fail(err);
            done();
        });
    });

    it('should read a file', (done) => {

        store.create('test_read', str2ab('qwer'))
            .then(() => { return store.read('test_read',false,false); })
            .then((data) => {
                expect(data.toString()).toEqual('qwer');
                done();
            })
            .catch(err => {
                fail(err);
                done();
            });
    });

    it('should update a file', (done) => {

        store.create('test_update', str2ab('yxcv'))
            .then(() => { return store.update('test_update', str2ab('yxcvb')); })
            .then(() => {
                fs.readFile(storeProjectPath + 'test_update', (err, data) => {
                    expect(err).toBe(null);
                    expect(data.toString()).toEqual('yxcvb');
                    done();
                });
            })
            .catch(err => {
                fail(err);
                done();
            });
    });

    it('should remove a file', (done) => {

        spyOn(console, 'error'); // to suppress console.error output
        store.create('test_remove', str2ab('sdfg'))
            .then(() => {
                return store.remove('test_remove')
                    .then(() => {
                        store.read('test_remove', false, false)
                            .then(result => {
                                // missing original is ok
                                expect(result).toEqual('');
                                return store.read('test_remove', false, true);
                            })
                            .then(() => {
                                // missing thumb is not ok
                                fail('reading removed file worked unexpectedly');
                                done();
                            })
                            .catch(err => {
                                expect(err[0]).toEqual(M.IMAGESTORE_ERROR_MEDIASTORE_READ);

                                fs.readFile(storeProjectPath + 'test_remove', (err) => {
                                    expect(err).toBeTruthy();
                                    expect(err.code).toEqual('ENOENT');
                                    done();
                                });
                            });
                    })
                    .catch(err => {
                        fail(err);
                        done();
                    })
            })
            .catch(err => {
                fail(err);
                done();
            });
    });

});