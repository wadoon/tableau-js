{
  import { Term } from "./Term";
}

FormulaQ
  = prefix:(q:('forall' / 'exists') __ v:[a-zA-Z]+ _ '.' __)* 
    imp:FormulaImp 
    {    	
    	let value = imp;
        prefix.forEach((elem,id) => {
        	value = new Term(elem[0], null, elem[2].join(""), [value])
        });
    	return value;
    }
    
FormulaImp 
  = a:FormulaOr b:(_ '->' _ FormulaOr)* 
    {
    	if(b.length>0){
    	    const args = [a]
            b.forEach( (elem, id) => { args.push(elem[3]); });
    		return new Term("imp", null, null, args);
    	}
    	else return a;   
    }
  
FormulaOr 
  = a:FormulaAnd b:(('\\/' / '|')  FormulaAnd)*
    {
     	if(b.length > 0){
    		const args = [a]
            b.forEach( (elem, id) => { args.push(elem[3]); });
    		return new Term("or", null, null, args);
    	}
    	else return a;   
    }
    
  
FormulaAnd 
  = a:FormulaNot b:(_ ('/\\' / '&') _  FormulaNot)*
    {
    	if(b.length > 0){
        	const args = [a]
            b.forEach( (elem, id) => { args.push(elem[3]); });
    		return new Term("and", null, null, args);
    	}
    	else return a;   
    }
  
FormulaNot 
  = not:(('-'_) / ('not'__))? b:Predicate
    {
    	if(not) return new Term("not", null, null, [b]);
    	else return b;
    }
 
Predicate  
  = a:([a-zA-Z] [a-zA-Z0-9]*) args:('(' _ Term _ (',' _ Term _ )* ')')?
  	{
    	
    	return new Term('predicate', a.join(""), null, 
          args != null
        	  ? args.filter(i => typeof(i)!="string" && i.length!=0)
            : []
      );
    }  
  / a:Term _ '=' _ b:Term
  	{
    	return new Term("predicate", "eq", null, [a,b]); 
    }	
  / '(' _ a:FormulaQ _ ')'
  	{
    	return a
    }	
Term
  = func:([a-zA-Z] [a-zA-Z0-9]*) args:('(' _ Term (_ ',' _ Term)* _ ')')?
  	{
    	return new Term("term", func.join(""), null, 
          args != null 
        	  ? args.filter(i => typeof(i)!="string" && i.length!=0)
            : []);
    }	
    
// optional whitespace
_  = [ \t\r\n]*

// mandatory whitespace
__ = [ \t\r\n]+