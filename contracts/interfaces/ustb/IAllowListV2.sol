// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAllowListV2 {
    type EntityId is uint256;

    /// @notice An event emitted when an address's permission is changed for a fund.
    event FundPermissionSet(
        EntityId indexed entityId,
        string fundSymbol,
        bool permission
    );

    /// @notice An event emitted when a protocol's permission is changed for a fund.
    event ProtocolAddressPermissionSet(
        address indexed addr,
        string fundSymbol,
        bool isAllowed
    );

    /// @notice An event emitted when an address is associated with an entityId
    event EntityIdSet(address indexed addr, uint256 indexed entityId);

    /// @dev Thrown when the input for a function is invalid
    error BadData();

    /// @dev Thrown when the input is already equivalent to the storage being set
    error AlreadySet();

    /// @dev An address's entityId can not be changed once set, it can only be unset and then set to a new value
    error NonZeroEntityIdMustBeChangedToZero();

    /// @dev Thrown when trying to set entityId for an address that has protocol permissions
    error AddressHasProtocolPermissions();
    /// @dev Thrown when trying to set protocol permissions for an address that has an entityId
    error AddressHasEntityId();
    /// @dev Thrown when trying to set protocol permissions but the code size is 0
    error CodeSizeZero();
    /// @dev Thrown when a method is no longer supported
    error Deprecated();
    /// @dev Thrown if an attempt to call `renounceOwnership` is made
    error RenounceOwnershipDisabled();

    function owner() external view returns (address);

    /**
     * @notice Gets the entityId for the provided address
     * @param addr The address to get the entityId for
     */
    function addressEntityIds(address addr) external view returns (EntityId);

    /**
     * @notice Checks whether an address is allowed to use a fund
     * @param addr The address to check permissions for
     * @param fundSymbol The fund symbol to check permissions for
     */
    function isAddressAllowedForFund(address addr, string calldata fundSymbol)
        external
        view
        returns (bool);

    /**
     * @notice Checks whether an Entity is allowed to use a fund
     * @param fundSymbol The fund symbol to check permissions for
     */
    function isEntityAllowedForFund(
        EntityId entityId,
        string calldata fundSymbol
    ) external view returns (bool);

    /**
     * @notice Sets whether an Entity is allowed to use a fund
     * @param fundSymbol The fund symbol to set permissions for
     * @param isAllowed The permission value to set
     */
    function setEntityAllowedForFund(
        EntityId entityId,
        string calldata fundSymbol,
        bool isAllowed
    ) external;

    /**
     * @notice Sets the entityId for a given address. Setting to 0 removes the address from the allowList
     * @param entityId The entityId to associate with an address
     * @param addr The address to associate with an entityId
     */
    function setEntityIdForAddress(EntityId entityId, address addr) external;

    /**
     * @notice Sets the entity Id for a list of addresses. Setting to 0 removes the address from the allowList
     * @param entityId The entityId to associate with an address
     * @param addresses The addresses to associate with an entityId
     */
    function setEntityIdForMultipleAddresses(
        EntityId entityId,
        address[] calldata addresses
    ) external;

    /**
     * @notice Sets protocol permissions for an address
     * @param addr The address to set permissions for
     * @param fundSymbol The fund symbol to set permissions for
     * @param isAllowed The permission value to set
     */
    function setProtocolAddressPermission(
        address addr,
        string calldata fundSymbol,
        bool isAllowed
    ) external;

    /**
     * @notice Sets protocol permissions for multiple addresses
     * @param addresses The addresses to set permissions for
     * @param fundSymbol The fund symbol to set permissions for
     * @param isAllowed The permission value to set
     */
    function setProtocolAddressPermissions(
        address[] calldata addresses,
        string calldata fundSymbol,
        bool isAllowed
    ) external;

    /**
     * @notice Sets entity for an array of addresses and sets permissions for an entity
     * @param entityId The entityId to be updated
     * @param addresses The addresses to associate with an entityId
     * @param fundPermissionsToUpdate The funds to update permissions for
     * @param fundPermissions The permissions for each fund
     */
    function setEntityPermissionsAndAddresses(
        EntityId entityId,
        address[] calldata addresses,
        string[] calldata fundPermissionsToUpdate,
        bool[] calldata fundPermissions
    ) external;

    function hasAnyProtocolPermissions(address addr)
        external
        view
        returns (bool hasPermissions);

    function protocolPermissionsForFunds(address protocol)
        external
        view
        returns (uint256);

    function protocolPermissions(address, string calldata)
        external
        view
        returns (bool);

    function initialize() external;
}
