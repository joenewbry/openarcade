#include "Player/MCMenuPlayerController.h"

#include "Blueprint/UserWidget.h"
#include "UI/MCMenuRootWidget.h"

void AMCMenuPlayerController::BeginPlay()
{
	Super::BeginPlay();

	if (MenuRootWidgetClass)
	{
		MenuRootWidget = CreateWidget<UMCMenuRootWidget>(this, MenuRootWidgetClass);
		if (MenuRootWidget)
		{
			MenuRootWidget->AddToViewport(0);

			FInputModeUIOnly InputMode;
			InputMode.SetWidgetToFocus(MenuRootWidget->TakeWidget());
			InputMode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
			SetInputMode(InputMode);
			bShowMouseCursor = true;
		}
	}
}
