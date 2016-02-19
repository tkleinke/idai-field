import {Injectable} from "angular2/core";
import {Message} from "../model/message";

/**
 * Maintains a collection of currently active messages the
 * user can see at a given moment. Messages can be added
 * or removed based on identifiers.
 *
 * @author Jan G. Wieners
 * @author Daniel M. de Oliveira
 */
@Injectable()
export class Messages {

    // This map contains the message bodies
    // messages identified by their key.
    // It can be replaced later by another data source
    // like an external service.
    public static MESSAGES = {
        "objectlist/idexists" : "Object Identifier already exists.",
        "temp" : "temp" // TODO used just for test, should be removed soon
    };

    private messages: Message[] = [];

    /**
     * Holds the collection to be delivered when calling {@link Messages#getMessages()}.
     *
     * Angular2 expects a non-changing
     * object / array to generate the view.
     * If getMessages() would convert the map "messages" every time to an array when it gets executed,
     * Angular2 would fail with "Expression has changed after it was checked" exception.
     */
    private messageStack = [];



    public add(id,level): void {

        var content = Messages.MESSAGES[id];
        if (!content)
            throw "No message body found for key '"+id+"'";

        this.messages[id] = {
            'level' : level,
            content: content
        };

    }

    public delete(id) {
        delete this.messages[id];
    }

    public deleteMessages() {
        this.messages.length = 0;
        this.messageStack.length = 0;
    }

    /**
     * Provides access to the messages data structure
     * which can be used as an angular model since
     * it is guaranteed that getMessages() returns always the
     * same object.
     *
     * @returns {Array} reference to the collection of current messages.
     */
    public getMessages() {
        this.refreshMessageStack();
        return this.messageStack;
    }

    /**
     * Updates messageStack on the basis of the current state of messages.
     */
    private refreshMessageStack(): void {

        this.messageStack.length = 0;

        for (var p in this.messages) {
            if(this.messages.hasOwnProperty(p)) {
                this.messageStack.push(this.messages[p]);
            }
        }
    }
}

