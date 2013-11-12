/**
 * @description Defines a new type.
 * @returns {Type}
 *
 * Inspired by John Resig's "Simple JavaScript Inheritance" class.
 */
var type = window.type = function()
{
    var Scope = null;
    var run = true;

    var Type = function()
    {
        if ( ( inits & TYPE_CHECK ) === TYPE_CHECK )
        {
            typeCheckResult = true;
            return;
        }
        if ( ( inits & SCOPE ) === SCOPE )
        {
            if ( Scope === null )
                Scope = defineScope( Type );
            var scope = { parent: null };
            if ( IE8 )
            {
                scope.self = document.createElement();
                applyPrototypeMembers( Scope, scope.self );
            }
            else
                scope.self = new Scope();
            return scope;
        }
        if ( ( inits & PUB ) === PUB && run )
        {
            var pub;
            run = false;
            if ( IE8 )
            {
                pub = document.createElement();
                applyPrototypeMembers( Type, pub );
            }
            else
                pub = new Type();
            init( Type, pub, arguments );
            run = true;
            return pub;
        }
    };

    Type.members = {};
    Type.parent = null;
    Type.mixins = [];
    
    /**
     * @description Sets the base type.
     * @param {Type|function} Base
     * @returns {Type}
     */
    Type.extend = function( Base )
    {
        // Since name collision detection happens when the type is defined, we must prevent people
        // from changing the inheritance hierarchy after defining members.
        if ( keys( Type.members ).length > 0 )
            throw new Error( "Cannot change the base type after members have been defined." );

        if ( !isFunc( Base ) )
            throw new Error( "Base type must be a function." );

        // Only set the parent member if the base type was created by us.
        if ( isTypeOurs( Base ) )
        {
            // Check for circular reference.
            var t = Base;
            while ( t )
            {
                if ( t === Type )
                    throw new Error( "Cannot inherit from " + ( Base === Type ? "self" : "derived type" ) + "." );
                t = t.parent;
            }

            Type.parent = Base;
        }

        inits &= ~PUB;
        Type.prototype = new Base();
        inits |= PUB;

        return Type;
    };

    /**
     * @description
     * Defines members on the type.
     *
     * Example: The following defines a public method `foo`, a private method `bar`, and a public
     * virtual method `baz` on the type `MyType`.
     *
        <pre>
          var MyType = type().def({
            foo: function() { },
            __bar: function() { },
            $baz: function() { }
          });
        </pre>
     *
     * @param {hash} members
     * @returns {Type}
     */
    Type.def = function( members )
    {
        each( members, function( member, name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === CTOR )
            {
                if ( isArray( member ) )
                {
                    Type.$inject = member;
                    member = member.pop();
                    if ( Type.$inject[0] === "..." )
                    {
                        if ( Type.parent === null || !Type.parent.$inject || Type.parent.$inject.length === 0 )
                            throw new Error( "The '...' syntax is invalid when a base type does not exist or has no dependencies." );
                        Type.$inject.splice( 0, 1 );
                        Type.$inject = Type.parent.$inject.concat( Type.$inject );
                    }
                }
                if ( !isFunc( member ) )
                    throw new Error( "Constructor must be a function." );
            }

            Type.members[ name ] = {
                access: info.access,
                isVirtual: info.isVirtual
            };

            if ( isFunc( member ) )
                defineMethod( Type, name, member );
            else
                defineProperty( Type, info, member );
        });

        return Type;
    };

    /**
     * @description Defines events on the type.
     * @param {array} events
     * @returns {Type}
     */
    Type.events = function( events )
    {
        each( events, function( name )
        {
            var info = parseMember( name );
            name = info.name;

            validateMember( Type, info );

            if ( name === CTOR )
                throw new Error( "Event cannot be named 'ctor'." );

            if ( info.isVirtual )
                throw new Error( "Events cannot be virtual." );

            Type.members[ name ] = {
                access: info.access,
                isEvent: true
            };
        });
        return Type;
    };

    /**
     * @descriptions Mixes other types in with the type.
     * @param {array} types
     * @returns {Type}
     */
    Type.include = function( types )
    {
        each( types, function( mixin )
        {
            if ( !isTypeOurs( mixin ) )
                throw new Error( "Mixin must be a type." );

            if ( mixin === Type )
                throw new Error( "Cannot include self." );

            if ( mixin.members.ctor !== undefined && mixin.members.ctor.params.length > 0 )
                throw new Error( "Mixin cannot have dependencies." );

            checkMixinForCircularReference( Type, mixin );
            Type.mixins.push( mixin );
        });
        return Type;
    };

    return Type;
};
