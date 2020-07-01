import { Term, Substitution } from './Term'
import { AssertionError } from 'assert'

export class PNode {
    id = "node-" + Math.ceil(100000 * Math.random())
    x: number = 0
    y: number = 0

    /** defines the prefix of term, false == 0 prefix, true == 1 prefix */
    positive: boolean = true

    /** Term of the node, goals do not have a term. */
    term: Term | null = null

    /**  */
    children: Array<PNode> = []
    /** position in the parent's children array */
    pos: number = -1

    /** link to the parent node, null if this is the root proof node */
    parent: PNode | null = null

    /** defines whether this node is a goal. Goals are just a placeholder */
    goal: boolean = false
    /** if this goal is closed by a substitution */
    closed: boolean = false
    /**  */
    subst: Substitution | null = null

    /** introduced free variable by a gamma rule application */
    freeVar: string | null = null

    constructor(negated: boolean, term: Term | null) {
        this.term = term;
        this.positive = negated;
    }

    freeVars() {
        let cur: PNode | null = this
        let vars: Array<Term> = []
        while (cur != null) {
            if (cur.freeVar != null) {
                const fV: Term = new Term("var", cur.freeVar)
                vars.push(fV)
            }
            cur = cur.parent
        }
        return vars
    }

    appendGoal() {
        let g = new PNode(false, null)
        g.goal = true
        this.children.push(g)
        return g
    }


    allChildren(): Array<PNode> {
        const queue: Array<PNode> = [this];
        const found: Array<PNode> = [];
        while (queue.length != 0) {
            const cur = queue.pop()
            if (cur === undefined || found.includes(cur)) continue;
            found.push(cur)
            cur.children.forEach(i => queue.push(i))
        }
        return found
    }

    parents(): Array<PNode> {
        const p: Array<PNode> = [];
        let cur: PNode | null = this
        while (cur != null) {
            p.push(cur)
            cur = cur.parent
        }
        return p
    }
}

export class Rule {
    type: string = ""
    applicable(negated: boolean, term: Term): boolean { return false }
    apply(negated: boolean, term: Term, freeVars: Array<Term> = []): Array<PNode> { return [] }
}

export class AlphaRule extends Rule {
    type = "alpha"

    applicable = (n, t) => {
        if (!n) {
            return t.op == 'or' || t.op == 'imp' || t.op == 'not'
        } else {
            return t.op == 'and' || t.op == 'not'
        }
    }
    apply = (n, t) => {
        const c1 = t.args[0]
        let p1 = new PNode(false, c1)
        let p2;
        if (t.args.length == 2) {
            const c2 = t.args[1]
            p2 = new PNode(false, c2)
        } else {
            p2 = p1
        }

        switch (t.op) {
            case "and":
                p1.positive = true;
                p2.positive = true;
                break;
            case "imp":
                p1.positive = true;
                break;
            case "not":
                p1.positive = !n;
                p2.positive = !n;
                break;
        }


        if (t.op != "not") {
            return [p1, p2]
        }
        else {
            return [p1]
        }
    }
}



export class BetaRule extends Rule {
    type = 'beta'
    applicable = (pos, t) => {
        if (pos) {
            return t.op == 'or' || t.op == 'imp'
        } else {
            return t.op == 'and'
        }
    }
    apply = (n, t) => {
        const c1 = t.args[0]
        let p1 = new PNode(false, c1)
        const c2 = t.args[1]
        let p2 = new PNode(false, c2)

        switch (t.op) {
            case "or":
                p1.positive = true;
                p2.positive = true;
                break;
            case "imp":
                p1.positive = false;
                p2.positive = true;
                break;
        }
        return [p1, p2]
    }
}

let globalVariableCounter = 0

export class GammaRule extends Rule {
    type = 'gamma'
    applicable = (pos, t) => {
        if (pos) {
            return t.op == 'forall'
        } else {
            return t.op == 'exists'
        }
    }
    apply = (n, t) => {
        const bounded = t.bind
        if (bounded == undefined) throw new AssertionError()
        const c1 = t.args[0].copyTerm()
        const freeVar = bounded.toUpperCase() + (++globalVariableCounter)
        const c2 = c1.substituteVar(bounded, freeVar)
        let p1 = new PNode(n, c2)
        p1.freeVar = freeVar
        return [p1]
    }
}

export class DeltaRule extends Rule {
    type = "delta";
    applicable = (pos, t) => {
        if (!pos) {
            return t.op == 'forall'
        } else {
            return t.op == 'exists'
        }
    }

    apply = (n: boolean, t: Term, freeVars: Array<Term>) => {
        const bounded = t.bind
        if (bounded == undefined) throw new AssertionError()
        const c1 = t.args[0].copyTerm()

        const skolemFun: Term = new Term("term", "f" + (++globalVariableCounter), null, freeVars)

        const c2 = c1.substitute(bounded, skolemFun)
        let p1 = new PNode(n, c2)
        return [p1]
    }
}

//const RULES: Array<Rule> = [new AlphaRule(),]
