/**
 * @private
 * @description Initializes the type.
 * @param {Type} type The type to initialize.
 * @param {object} pub The public interface to initialize on.
 * @param {array} args Arguments for the constructor.
 */
function init( type, pub, args )
{
    var scope = create( type );

    pub.$type = type;

    /**
     * @internal
     * Use in conjunction with _pry to expose the private scope.
     */
    pub.$scope = function() {
        if ( pry === type )
            return scope.self;
    };

    scope.self._pub = pub;

    build( type, scope );
    expose( type, scope, pub );

    if ( scope.self.ctor !== undefined )
        scope.self.ctor.apply( scope.self, args );

    return scope.self;
}

/**
 * @private
 * @description Creates a new private scope.
 * @param {Type} type
 */
function create( type )
{
    var Scope = function() { };
    runInit = false;
    Scope.prototype = new type();
    runInit = true;

    /**
     * Creates a new instance of the type, but returns the private scope.
     * This allows access to private methods of other instances of the same type.
     */
    Scope.prototype._new = function()
    {
        runInit = false;
        var ret = init( type, new type(), arguments );
        runInit = true;
        return ret;
    };

    /**
     * Gets the private scope of the type instance.
     */
    Scope.prototype._pry = function( pub )
    {
        pry = type;
        var scope = !!pub.$scope && isFunc( pub.$scope ) ? pub.$scope() : null;
        pry = null;
        return scope || null;
    };

    return { self: new Scope(), parent: null };
}

/**
 * @private
 * @description Creates the type members on the instance.
 * @param {Type} type The instance type.
 * @param {Scope} scope The private scope of the instance.
 */
function build( type, scope )
{
    if ( type.parent !== null )
    {
        if (
            type.parent.members.ctor !== undefined &&
            type.parent.members.ctor.params.length > 0 &&
            ( type.members.ctor === undefined || !type.members.ctor.callsuper )
        )
            throw new Error( "Parent constructor contains parameters and must be called explicitly." );

        scope.parent = create( type.parent );
        scope.parent.self._pub = scope.self._pub;
        build( type.parent, scope.parent );
    }

    each( type.members, function( member, name )
    {
        if ( member.method !== undefined )
            method( type, scope, name, member );
        else
            property( type, scope, name, member );
    });

    if ( type.parent !== null )
    {
        each( type.parent.members, function( member, name )
        {
            if ( member.access !== "private" && type.members[ name ] === undefined )
                scope.self[ name ] = scope.parent.self[ name ];
        });
    }
}

/**
 * @private
 * @description Creates a method member.
 * @param {Type} type
 * @param {Scope} scope
 * @param {string} name
 * @param {object} member
 */
function method( type, scope, name, member )
{
    if ( name === "ctor" )
    {
        scope.self.ctor = function()
        {
            // Hide the constructor because it should never be called again.
            delete scope.self.ctor;

            var temp = scope.self._super;
            if ( type.parent !== null && type.parent.members.ctor !== undefined )
            {
                if ( type.parent.members.ctor.params.length > 0 )
                    scope.self._super = scope.parent.self.ctor;
                else
                    scope.parent.self.ctor();
            }
            member.method.apply( scope.self, arguments );
            scope.self._super = temp;
        };
    }
    else
    {
        if (
            scope.parent !== null &&
            scope.parent.self[ name ] !== undefined &&
            member.callsuper
        )
        {
            var _super = scope.parent.self[ name ];
            scope.self[ name ] = function()
            {
                var temp = scope.self._super;
                scope.self._super = _super;
                var result = member.method.apply( scope.self, arguments );
                scope.self._super = temp;
                return result;
            };
        }
        else
        {
            scope.self[ name ] = function() {
                return member.method.apply( scope.self, arguments );
            };
        }
    }
}

/**
 * @private
 * @description Creates a property member.
 * @param {Type} type
 * @param {Scope} scope
 * @param {string} name
 * @param {object} member
 */
function property( type, scope, name, member )
{
    function accessor( method, _super )
    {
        return function()
        {
            var tempSuper = scope.self._super;
            var tempValue = scope.self._value;
            scope.self._super = _super;
            
            addProperty( scope.self, "_value",
            {
                get: function() {
                    return _value;
                },
                set: function( value ) {
                    _value = value;
                }
            });
            
            var result = method.apply( scope.self, arguments );
            scope.self._super = tempSuper;

            delete scope.self._value;
            scope.self._value = tempValue;

            return result;
        };
    }

    var _value = member.value;
    var accessors = {};
    if ( member.get !== undefined )
    {
        accessors.get = accessor(
            member.get.method,
            !member.get.callsuper || scope.parent === null ? null : function( value ) {
                return scope.parent.self[ name ];
            }
        );
    }
    if ( member.set !== undefined )
    {
        accessors.set = accessor(
            member.set.method,
            !member.set.callsuper || scope.parent === null ? null : function( value ) {
                scope.parent.self[ name ] = value;
            }
        );
    }
    addProperty( scope.self, name, accessors );
}

/**
 * @private
 * @description Creates references to the public members of the type on the public interface.
 * @param {Type} type The type being instantiated.
 * @param {Scope} scope The type instance.
 * @param {object} pub The public interface.
 */
function expose( type, scope, pub )
{
    if ( type.parent !== null )
        expose( type.parent, scope.parent, pub );

    each( type.members, function( member, name )
    {
        if ( member.access !== "public" )
            return;

        if ( member.method !== undefined )
            pub[ name ] = scope.self[ name ];
        else
        {
            var accessors = {};
            if ( member.get !== undefined )
            {
                accessors.get = function() {
                    return scope.self[ name ];
                };
            }
            if ( member.set !== undefined )
            {
                accessors.set = function( value ) {
                    scope.self[ name ] = value;
                };
            }
            addProperty( pub, name, accessors );
        }
    });
}

/**
 * @private
 * @description
 * Adds a property to an object.
 * http://johndyer.name/native-browser-get-set-properties-in-javascript/
 * @param {object} obj
 * @param {string} name
 * @param {object} accessors
 */
function addProperty( obj, name, accessors )
{
    accessors.configurable = true;

    // modern browsers, IE9+, and IE8 (must be a DOM object)
    if ( Object.defineProperty )
        Object.defineProperty( obj, name, accessors );

    // older mozilla
    else if ( obj.__defineGetter__ )
    {
        obj.__defineGetter__( name, accessors.get );
        obj.__defineSetter__( name, accessors.set );
    }
    else
        throw new Error( "JavaScript properties are not supported by this browser." );
}