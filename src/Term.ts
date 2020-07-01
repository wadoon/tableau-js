import { SyntaxError, parse } from './grammar';
import { AssertionError } from 'assert';

export type Substitution = Map<string, Term>

/// Term thingies
export class Term {
    op: string
    bind: string | null
    name: string | null
    args: Array<Term>

    constructor(op: string, name: string | null = null, bind: string | null = null, args: Array<Term> = []) {
        this.op = op
        this.name = name
        this.bind = bind
        this.args = args

        for (const it of args)
            if (it == undefined)
                throw new AssertionError({ message: "undefined term in args" })
    }

    copyTerm(): Term {
        //const args = this.args.map(i => { return i.copyTerm() })
        const args: Array<Term> = []
        for (const i of this.args) {
            args.push(i.copyTerm());
        }

        console.log("args", this.args, args)
        return new Term(this.op, this.name, this.bind, args)
    }

    substituteVar(bounded: string, arg1: string): Term {
        return this.substitute(bounded, new Term("var", arg1))
    }

    substitute(bounded: string, arg: Term): Term {
        const s = new Map<string, Term>()
        s.set(bounded, arg)
        return this.substituteAll(s)
    }

    substituteAll(subst: Substitution): Term {
        switch (this.op) {
            case "not":
            case "imp":
            case "or":
            case "and":
            case "predicate":
                for (const key in this.args) {
                    this.args[key] = this.args[key].substituteAll(subst)
                }
                break;

            case "var":
                if (subst.has(this.name!))
                    return subst.get(this.name!)!
                else return this
                break;
            case "exists":
            case "forall":
                if (subst.has(this.bind!)) {
                    for (const key in this.args) {
                        this.args[key] = this.args[key].substituteAll(subst)
                    }
                }
        }
        return this
    }

    rewriteVars(vars: Array<string> = []) {
        switch (this.op) {
            case "not":
            case "imp":
            case "or":
            case "and":
            case "predicate":
            case "var":
                for (const key in this.args) {
                    this.args[key] = this.args[key].rewriteVars(vars)
                }
                break;
            case 'term':
                if (this.args.length == 0 && vars.includes(this.name !== null ? this.name : "")) {
                    this.op = "var"
                }
            case "exists":
            case "forall":
                if (this.bind != undefined) {
                    vars.push(this.bind)
                    for (const key in this.args) {
                        this.args[key] = this.args[key].rewriteVars(vars)
                    }
                    vars.pop()
                }
        }
        return this
    }


    eq(other: Term | null): boolean {
        if (other == null) return this == null;
        if (other.bind != this.bind
            || other.name != this.name
            || other.op != this.op
            || other.args.length != this.args.length)
            return false;

        for (let i = 0; i < other.args.length; i++) {
            if (!other.args[i].eq(this.args[i])) {
                return false;
            }
        }
        return true;
    }
}

export function unify(t: Term, s: Term, subst: Substitution): boolean {
    let a = t.copyTerm().substituteAll(subst)
    let b = s.copyTerm().substituteAll(subst)
    return a.eq(b)
}

export function parseTerm(input: string): Term {
    const t = parse(input);
    t.rewriteVars()
    return t
}